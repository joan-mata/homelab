export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { remindMissingPredictions } from '@/lib/telegram';
import { NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cron-auth';


export async function POST(req: Request) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tomorrow    = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayStart    = new Date(tomorrow.setHours(0, 0, 0, 0));
  const dayEnd      = new Date(tomorrow.setHours(23, 59, 59, 999));

  const matches = await db.match.findMany({
    where: {
      kickoff: { gte: dayStart, lte: dayEnd },
      status:  'SCHEDULED',
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
  });

  if (matches.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const users = await db.user.findMany({
    where: { active: true, telegramChatId: { not: null }, telegramToken: { not: null } },
  });

  let sent = 0;
  for (const user of users) {
    const hasPrediction = await db.prediction.findMany({
      where: { userId: user.id, matchId: { in: matches.map(m => m.id) } },
      select: { matchId: true },
    });
    const predictedIds = new Set(hasPrediction.map(p => p.matchId));
    const missing = matches.filter(m => !predictedIds.has(m.id));

    if (missing.length === 0) continue;

    await remindMissingPredictions(user.telegramChatId!, user.telegramToken!, missing.map(m => ({
      homeTeam: m.homeTeamId!,
      awayTeam: m.awayTeamId!,
      kickoff:  m.kickoff,
    }))).catch(e => console.error('[reminders] telegram:', e));
    sent++;
  }

  return NextResponse.json({ ok: true, sent });


}
