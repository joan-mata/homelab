import type { MatchEvent } from './football-api';

const BASE        = 'https://v3.football.api-sports.io';
const LEAGUE_ID   = parseInt(process.env.APIFOOTBALL_LEAGUE_ID ?? '1');
const SEASON      = 2026;
const BUDGET      = 90; // max events requests per day (leaves 10 for mapping/other)
const MIN_INTERVAL = 2; // never poll faster than this (minutes)

async function apiFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-apisports-key': process.env.APIFOOTBALL_KEY ?? '' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-football ${res.status}: ${path}`);
  return res.json();
}

export const fetchFixturesByDate = (date: string) => apiFetch(`/fixtures?date=${date}&timezone=UTC`);
export const fetchFixtureEvents  = (id: number) => apiFetch(`/fixtures/events?fixture=${id}`);

// Returns optimal polling interval in minutes for today's matches.
// Knockout matches count as 150 min (90 + 30 ET + ~20 penalties).
export function calcIntervalMinutes(todayMatchCount: number, hasKnockout: boolean): number {
  const matchDuration = hasKnockout ? 150 : 90;
  const totalMinutes  = todayMatchCount * matchDuration;
  return Math.max(MIN_INTERVAL, Math.ceil(totalMinutes / BUDGET));
}

export type AfEvent = {
  time:   { elapsed: number; extra: number | null };
  type:   string;
  detail: string;
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  team:   { id: number; name: string };
};

export function parseAfEvents(
  events: AfEvent[],
  homeApiTeamId: number,
  homeTeamId: string,
  awayTeamId: string,
): MatchEvent[] {
  const result: MatchEvent[] = [];

  for (const e of events) {
    if (e.type === 'subst' || e.type === 'Var') continue;

    const teamId = e.team.id === homeApiTeamId ? homeTeamId : awayTeamId;

    let type: MatchEvent['type'];
    if (e.type === 'Goal') {
      type = e.detail === 'Own Goal' ? 'OWN_GOAL'
           : e.detail === 'Penalty'  ? 'PENALTY'
           : 'GOAL';
    } else if (e.type === 'Card') {
      type = e.detail === 'Red Card'        ? 'RED_CARD'
           : e.detail === 'Yellow Red Card' ? 'YELLOW_RED_CARD'
           : 'YELLOW_CARD';
    } else {
      continue;
    }

    result.push({
      minute:    e.time.elapsed,
      extraTime: e.time.extra ?? undefined,
      type,
      teamId,
      playerName: e.player.name,
      detail:    e.type === 'Goal' ? (e.assist.name ?? undefined) : undefined,
    });
  }

  return result.sort((a, b) => a.minute - b.minute || (a.extraTime ?? 0) - (b.extraTime ?? 0));
}
