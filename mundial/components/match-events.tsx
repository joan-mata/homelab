import type { MatchEvent } from '@/lib/football-api';

const ICON: Record<MatchEvent['type'], string> = {
  GOAL:            '⚽',
  OWN_GOAL:        '⚽',
  PENALTY:         '⚽',
  YELLOW_CARD:     '🟨',
  RED_CARD:        '🟥',
  YELLOW_RED_CARD: '🟨🟥',
};

const SUBLABEL: Record<MatchEvent['type'], string> = {
  GOAL:            '',
  OWN_GOAL:        'propia',
  PENALTY:         'pen.',
  YELLOW_CARD:     'amarilla',
  RED_CARD:        'roja',
  YELLOW_RED_CARD: '2ª amarilla',
};

function minuteLabel(e: MatchEvent): string {
  return e.extraTime ? `${e.minute}+${e.extraTime}'` : `${e.minute}'`;
}

function shortName(full: string): string {
  const comma = full.indexOf(',');
  return comma === -1 ? full : full.slice(0, comma).trim();
}

// Returns which team's net the ball ended up in (for score tracking)
function scoresSide(e: MatchEvent, homeId: string | null): 'home' | 'away' | null {
  if (e.type === 'GOAL' || e.type === 'PENALTY') return e.teamId === homeId ? 'home' : 'away';
  if (e.type === 'OWN_GOAL') return e.teamId === homeId ? 'away' : 'home';
  return null;
}

interface Props {
  events:     MatchEvent[];
  homeTeamId: string | null;
  awayTeamId: string | null;
}

export function MatchEvents({ events, homeTeamId, awayTeamId }: Props) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin eventos registrados aún.</p>;
  }

  // Track running score as we render
  let homeGoals = 0;
  let awayGoals = 0;

  return (
    <div>
      {/* Team header */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 mb-2 pb-2 border-b">
        <span className="text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {homeTeamId ?? 'Local'}
        </span>
        <span className="w-14" />
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {awayTeamId ?? 'Visitante'}
        </span>
      </div>

      <div className="space-y-0.5">
        {events.map((e, i) => {
          const isHome = e.teamId === homeTeamId;
          const side   = scoresSide(e, homeTeamId);

          // Advance score before rendering — score bubble shows new total
          if (side === 'home') homeGoals++;
          else if (side === 'away') awayGoals++;

          const isGoal    = side !== null;
          const sublabel  = SUBLABEL[e.type];
          const hasAssist = isGoal && e.detail;

          return (
            <div
              key={i}
              className={`grid grid-cols-[1fr_auto_1fr] gap-x-3 items-center ${isGoal ? 'py-2' : 'py-1'}`}
            >
              {/* ── Left column: home events ── */}
              <div className="flex items-center justify-end gap-1.5">
                {isHome ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="text-right min-w-0">
                      <p className={`text-sm leading-tight truncate ${isGoal ? 'font-semibold' : 'font-medium'}`}>
                        {shortName(e.playerName)}
                      </p>
                      {sublabel && (
                        <p className="text-xs text-muted-foreground leading-tight">{sublabel}</p>
                      )}
                      {hasAssist && (
                        <p className="text-xs text-muted-foreground leading-tight">
                          asist. {shortName(e.detail!)}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-base leading-none">{ICON[e.type]}</span>
                  </div>
                ) : null}
              </div>

              {/* ── Center column: minute + score badge ── */}
              <div className="flex flex-col items-center gap-0.5 w-14">
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                  {minuteLabel(e)}
                </span>
                {isGoal && (
                  <span className="text-xs font-bold bg-muted rounded-full px-2 py-0.5 tabular-nums leading-tight">
                    {homeGoals}–{awayGoals}
                  </span>
                )}
              </div>

              {/* ── Right column: away events ── */}
              <div className="flex items-center gap-1.5">
                {!isHome ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0 text-base leading-none">{ICON[e.type]}</span>
                    <div className="min-w-0">
                      <p className={`text-sm leading-tight truncate ${isGoal ? 'font-semibold' : 'font-medium'}`}>
                        {shortName(e.playerName)}
                      </p>
                      {sublabel && (
                        <p className="text-xs text-muted-foreground leading-tight">{sublabel}</p>
                      )}
                      {hasAssist && (
                        <p className="text-xs text-muted-foreground leading-tight">
                          asist. {shortName(e.detail!)}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
