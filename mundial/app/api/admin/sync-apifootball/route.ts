export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchWCFixtures } from '@/lib/apifootball';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const cronAuth = req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;
  if (!cronAuth) {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const data = await fetchWCFixtures();
  const fixtures: Array<{
    fixture: { id: number; date: string };
    teams: { home: { id: number }; away: { id: number } };
  }> = data.response ?? [];

  let mapped = 0;
  for (const f of fixtures) {
    const kickoff    = new Date(f.fixture.date);
    const kickoffMin = new Date(kickoff.getTime() - 5 * 60 * 1000);
    const kickoffMax = new Date(kickoff.getTime() + 5 * 60 * 1000);

    const match = await db.match.findFirst({
      where: { kickoff: { gte: kickoffMin, lte: kickoffMax } },
      select: { id: true },
    });

    if (!match) continue;

    await db.match.update({
      where: { id: match.id },
      data: {
        apifootballId:       f.fixture.id,
        apifootballHomeTeamId: f.teams.home.id,
      },
    });
    mapped++;
  }

  return NextResponse.json({ ok: true, fixtures: fixtures.length, mapped });
}
