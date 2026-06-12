export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { sendMorningSummary } from '@/lib/telegram';
import { NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cron-auth';


// Devuelve el inicio de la ventana: 9:00 Madrid = 7:00 UTC durante el Mundial (UTC+2)
function get9amMadridUtc(date: Date): Date {
  const ymd = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(date);
  const d = new Date(`${ymd}T09:00:00Z`);
  d.setUTCHours(9 - 2); // UTC+2 en verano
  return d;
}

export async function POST(req: Request) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Ventana de hoy: 9am Madrid HOY → 9am Madrid MAÑANA
  const todayStart = get9amMadridUtc(now);
  const todayEnd   = new Date(todayStart.getTime() + 24 * 3600 * 1000);

  // Ventana de ayer: 9am Madrid AYER → 9am Madrid HOY
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);
  const yesterdayEnd   = todayStart;

  const [todayMatches, yesterdayMatches, users] = await Promise.all([
    db.match.findMany({
      where: {
        kickoff: { gte: todayStart, lt: todayEnd },
        status: 'SCHEDULED',
        homeTeamId: { not: null },
        awayTeamId: { not: null },
      },
      orderBy: { kickoff: 'asc' },
    }),
    db.match.findMany({
      where: {
        kickoff: { gte: yesterdayStart, lt: yesterdayEnd },
        status: 'FINISHED',
      },
      select: { id: true },
    }),
    db.user.findMany({
      where: { active: true, telegramChatId: { not: null }, telegramToken: { not: null } },
      select: { id: true, telegramChatId: true, telegramToken: true },
    }),
  ]);

  const yesterdayMatchIds = yesterdayMatches.map(m => m.id);
  const todayMatchIds     = todayMatches.map(m => m.id);

  // Pre-fetch todas las predicciones relevantes para todos los usuarios
  const [allTodayPreds, allYesterdayPreds, allUsers] = await Promise.all([
    todayMatchIds.length > 0
      ? db.prediction.findMany({
          where: { matchId: { in: todayMatchIds } },
          select: { userId: true, matchId: true },
        })
      : Promise.resolve([]),
    yesterdayMatchIds.length > 0
      ? db.prediction.findMany({
          where: { matchId: { in: yesterdayMatchIds }, points: { not: null } },
          select: { userId: true, points: true },
        })
      : Promise.resolve([]),
    // Ranking: todos los puntos de todos los usuarios activos (USER role)
    db.user.findMany({
      where: { active: true, role: 'USER' },
      select: {
        id: true,
        predictions: { where: { points: { not: null } }, select: { points: true } },
        extraBets:   { where: { resolved: true }, select: { points: true } },
      },
    }),
  ]);

  // Calcular ranking global
  const rankingRows = allUsers.map(u => ({
    id:    u.id,
    total: u.predictions.reduce((s, p) => s + (p.points ?? 0), 0) +
           u.extraBets.reduce((s, e) => s + (e.points ?? 0), 0),
  })).sort((a, b) => b.total - a.total);

  const totalPlayers = rankingRows.length;

  let sent = 0;
  for (const user of users) {
    // Partidos de hoy con predicción o sin
    const myTodayPredMatchIds = new Set(
      allTodayPreds.filter(p => p.userId === user.id).map(p => p.matchId)
    );
    const missingIds = new Set(
      todayMatchIds.filter(id => !myTodayPredMatchIds.has(id))
    );

    // Puntos de ayer
    const yesterdayPts = allYesterdayPreds
      .filter(p => p.userId === user.id)
      .reduce((s, p) => s + (p.points ?? 0), 0);

    // Ranking
    const rankIdx = rankingRows.findIndex(r => r.id === user.id);
    const rank    = rankIdx >= 0 ? rankIdx + 1 : totalPlayers;
    const myTotal = rankIdx >= 0 ? rankingRows[rankIdx].total : 0;

    const todayMatchesPayload = todayMatches.map(m => ({
      homeTeam: m.homeTeamId!,
      awayTeam: m.awayTeamId!,
      kickoff:  m.kickoff,
      matchId:  m.id,
    }));

    await sendMorningSummary(user.telegramChatId!, user.telegramToken!, {
      todayMatches: todayMatchesPayload,
      missingIds,
      yesterday: { pts: yesterdayPts, rank, totalPlayers, myTotal },
    }).catch(e => console.error('[morning-summary] telegram:', e));
    sent++;
  }

  return NextResponse.json({ ok: true, sent });


}
