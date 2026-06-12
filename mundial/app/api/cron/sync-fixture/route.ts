export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { fetchAllMatches, mapStatus, mapStage, countryFlag } from '@/lib/football-api';
import { NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cron-auth';


export async function POST(req: Request) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await fetchAllMatches();
    const matches = data.matches ?? [];
    let upserted = 0;

    for (const m of matches) {
      const homeTeamId = m.homeTeam?.tla ?? null;
      const awayTeamId = m.awayTeam?.tla ?? null;

      // Upsert teams
      if (m.homeTeam?.tla && m.homeTeam?.name) {
        await db.team.upsert({
          where: { id: m.homeTeam.tla },
          create: {
            id:    m.homeTeam.tla,
            name:  m.homeTeam.name,
            group: m.group ?? 'A',
            flag:  countryFlag(m.homeTeam.tla),
          },
          update: { name: m.homeTeam.name },
        });
      }
      if (m.awayTeam?.tla && m.awayTeam?.name) {
        await db.team.upsert({
          where: { id: m.awayTeam.tla },
          create: {
            id:    m.awayTeam.tla,
            name:  m.awayTeam.name,
            group: m.group ?? 'A',
            flag:  countryFlag(m.awayTeam.tla),
          },
          update: { name: m.awayTeam.name },
        });
      }

      await db.match.upsert({
        where:  { externalId: String(m.id) },
        create: {
          externalId: String(m.id),
          homeTeamId,
          awayTeamId,
          kickoff:   new Date(m.utcDate),
          stage:     mapStage(m.stage),
          group:     m.group ?? null,
          venueCity: m.venue ?? '',
          status:    mapStatus(m.status),
        },
        update: {
          homeTeamId,
          awayTeamId,
          kickoff:   new Date(m.utcDate),
          status:    mapStatus(m.status),
          venueCity: m.venue ?? '',
        },
      });
      upserted++;
    }

    return NextResponse.json({ ok: true, upserted });
  } catch (e) {
    console.error('[sync-fixture]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
