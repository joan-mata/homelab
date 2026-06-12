export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { fetchMatch, parseMatchEvents } from '@/lib/football-api';
import { NextResponse } from 'next/server';

function checkCronSecret(req: Request): boolean {
  return req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: Request) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const liveMatches = await db.match.findMany({
    where: { status: 'LIVE', externalId: { not: null } },
    select: { id: true, externalId: true },
  });

  if (liveMatches.length === 0) return NextResponse.json({ ok: true, updated: 0 });

  let updated = 0;
  for (const match of liveMatches) {
    try {
      const data   = await fetchMatch(match.externalId!);
      const events = parseMatchEvents(data);
      await db.match.update({ where: { id: match.id }, data: { events } });
      updated++;
    } catch (e) {
      console.error(`[sync-events] match ${match.id}:`, e);
    }
  }

  return NextResponse.json({ ok: true, updated });
}
