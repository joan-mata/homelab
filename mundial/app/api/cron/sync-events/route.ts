export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { fetchFixtureEvents, parseAfEvents, calcIntervalMinutes } from '@/lib/apifootball';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

const SETTING_LAST_SYNC     = 'apifootball_last_sync';
const SETTING_INTERVAL_DATE = 'apifootball_interval_date';
const SETTING_INTERVAL_MIN  = 'apifootball_interval_minutes';

function checkCronSecret(req: Request): boolean {
  return req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

async function getSetting(key: string): Promise<string | null> {
  const s = await db.setting.findUnique({ where: { key } });
  return s?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

// Calculate and cache today's optimal polling interval (minutes).
async function getIntervalMinutes(): Promise<number> {
  const todayUTC = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const cachedDate = await getSetting(SETTING_INTERVAL_DATE);

  if (cachedDate === todayUTC) {
    const cached = await getSetting(SETTING_INTERVAL_MIN);
    if (cached) return parseInt(cached);
  }

  // Recalculate for today
  const todayStart = new Date(`${todayUTC}T00:00:00Z`);
  const todayEnd   = new Date(`${todayUTC}T23:59:59Z`);

  const todayMatches = await db.match.findMany({
    where: {
      kickoff:      { gte: todayStart, lte: todayEnd },
      apifootballId: { not: null },
    },
    select: { stage: true },
  });

  const hasKnockout = todayMatches.some(m => m.stage !== 'GROUP');
  const interval    = calcIntervalMinutes(todayMatches.length, hasKnockout);

  await setSetting(SETTING_INTERVAL_DATE, todayUTC);
  await setSetting(SETTING_INTERVAL_MIN, String(interval));

  return interval;
}

export async function POST(req: Request) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const intervalMin = await getIntervalMinutes();
  const now         = Date.now();
  const lastSyncStr = await getSetting(SETTING_LAST_SYNC);
  const lastSync    = lastSyncStr ? new Date(lastSyncStr).getTime() : 0;

  if (now - lastSync < intervalMin * 60 * 1000) {
    return NextResponse.json({ ok: true, skipped: true, nextIn: Math.round((lastSync + intervalMin * 60 * 1000 - now) / 1000) + 's' });
  }

  const matches = await db.match.findMany({
    where: {
      apifootballId:       { not: null },
      apifootballHomeTeamId: { not: null },
      OR: [
        { status: 'LIVE' },
        { status: 'FINISHED', events: { equals: Prisma.DbNull } },
      ],
    },
    select: {
      id:                   true,
      apifootballId:        true,
      apifootballHomeTeamId: true,
      homeTeamId:           true,
      awayTeamId:           true,
    },
  });

  if (matches.length === 0) {
    await setSetting(SETTING_LAST_SYNC, new Date().toISOString());
    return NextResponse.json({ ok: true, updated: 0, intervalMin });
  }

  let updated = 0;
  for (const match of matches) {
    try {
      const data   = await fetchFixtureEvents(match.apifootballId!);
      const events = parseAfEvents(
        data.response ?? [],
        match.apifootballHomeTeamId!,
        match.homeTeamId ?? '',
        match.awayTeamId ?? '',
      );
      await db.match.update({ where: { id: match.id }, data: { events } });
      updated++;
    } catch (e) {
      console.error(`[sync-events] fixture ${match.apifootballId}:`, e);
    }
  }

  await setSetting(SETTING_LAST_SYNC, new Date().toISOString());
  return NextResponse.json({ ok: true, updated, intervalMin });
}
