export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { remindBeforeKickoff } from '@/lib/telegram';
import { NextResponse } from 'next/server';

function checkCronSecret(req: Request): boolean {
  return req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: Request) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now    = new Date();
  const in75   = new Date(now.getTime() + 75 * 60 * 1000);

  // Partidos SCHEDULED o LIVE cuyo kickoff está en los próximos 75 min
  // LIVE se incluye porque sync-results puede actualizar el status antes que este cron
  const upcomingMatches = await db.match.findMany({
    where: {
      status:     { in: ['SCHEDULED', 'LIVE'] },
      kickoff:    { gte: now, lte: in75 },
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
  });

  if (upcomingMatches.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const users = await db.user.findMany({
    where: { active: true, telegramChatId: { not: null }, telegramToken: { not: null } },
    select: { id: true, telegramChatId: true, telegramToken: true },
  });

  if (users.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // Pre-fetch predicciones para estos partidos
  const matchIds = upcomingMatches.map(m => m.id);
  const preds = await db.prediction.findMany({
    where: { matchId: { in: matchIds } },
    select: { userId: true, matchId: true },
  });
  const predSet = new Set(preds.map(p => `${p.userId}:${p.matchId}`));

  let sent = 0;
  for (const match of upcomingMatches) {
    const minutesLeft = Math.round((match.kickoff.getTime() - now.getTime()) / 60000);

    // Ventana "1h antes": 55-65 min
    const isOneHour = minutesLeft >= 55 && minutesLeft <= 65;
    // Ventana "inicio": 0-5 min
    const isKickoff = minutesLeft >= 0 && minutesLeft <= 5;

    if (!isOneHour && !isKickoff) continue;

    for (const user of users) {
      const hasPred = predSet.has(`${user.id}:${match.id}`);
      if (hasPred) continue;

      await remindBeforeKickoff(user.telegramChatId!, user.telegramToken!, {
        homeTeam:    match.homeTeamId!,
        awayTeam:    match.awayTeamId!,
        minutesLeft: isKickoff ? 0 : minutesLeft,
        kickoff:     match.kickoff,
      }).catch(e => console.error('[match-reminders] telegram:', e));
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
