export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canPredict } from '@/lib/deadline';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  matchId:         z.string().min(1).max(50),
  homeScore:       z.number().int().min(0).max(20),
  awayScore:       z.number().int().min(0).max(20),
  knockoutWinnerId: z.string().nullable().optional(),
  knockoutMethod:  z.enum(['EXTRA_TIME', 'PENALTIES']).nullable().optional(),
  etHomeScore:     z.number().int().min(0).max(20).nullable().optional(),
  etAwayScore:     z.number().int().min(0).max(20).nullable().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role === 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const { matchId, homeScore, awayScore, knockoutWinnerId, knockoutMethod, etHomeScore, etAwayScore } = parsed.data;
  const userId = session.user.id;

  const match = await db.match.findUnique({ where: { id: matchId }, select: { stage: true, homeTeamId: true, awayTeamId: true } });
  if (!match) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
  if (!match.homeTeamId || !match.awayTeamId) {
    return NextResponse.json({ error: 'Los equipos aún no están confirmados' }, { status: 400 });
  }

  const open = await canPredict(matchId, userId);
  if (!open) return NextResponse.json({ error: 'Plazo de predicción cerrado' }, { status: 403 });

  const isKnockout = match.stage !== 'GROUP';
  const isDraw     = homeScore === awayScore;

  if (isKnockout && isDraw && !knockoutWinnerId) {
    return NextResponse.json({ error: 'En eliminatorias con empate debes indicar quién avanza' }, { status: 400 });
  }

  await db.prediction.upsert({
    where:  { userId_matchId: { userId, matchId } },
    create: {
      userId, matchId, homeScore, awayScore,
      knockoutWinnerId: isKnockout && isDraw ? (knockoutWinnerId ?? null) : null,
      knockoutMethod:   isKnockout && isDraw ? (knockoutMethod ?? null) : null,
      etHomeScore:      isKnockout && isDraw && knockoutMethod === 'EXTRA_TIME' ? (etHomeScore ?? null) : null,
      etAwayScore:      isKnockout && isDraw && knockoutMethod === 'EXTRA_TIME' ? (etAwayScore ?? null) : null,
    },
    update: {
      homeScore, awayScore,
      knockoutWinnerId: isKnockout && isDraw ? (knockoutWinnerId ?? null) : null,
      knockoutMethod:   isKnockout && isDraw ? (knockoutMethod ?? null) : null,
      etHomeScore:      isKnockout && isDraw && knockoutMethod === 'EXTRA_TIME' ? (etHomeScore ?? null) : null,
      etAwayScore:      isKnockout && isDraw && knockoutMethod === 'EXTRA_TIME' ? (etAwayScore ?? null) : null,
      basePoints: null, knockoutPoints: null, points: null,
    },
  });

  return NextResponse.json({ ok: true });
}
