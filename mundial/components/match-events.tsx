import type { MatchEvent } from '@/lib/football-api';

const EVENT_ICON: Record<MatchEvent['type'], string> = {
  GOAL:            '⚽',
  OWN_GOAL:        '⚽',
  PENALTY:         '⚽',
  YELLOW_CARD:     '🟨',
  RED_CARD:        '🟥',
  YELLOW_RED_CARD: '🟥',
};

const EVENT_LABEL: Record<MatchEvent['type'], string> = {
  GOAL:            'Gol',
  OWN_GOAL:        'Gol en propia',
  PENALTY:         'Penalti',
  YELLOW_CARD:     'Amarilla',
  RED_CARD:        'Roja',
  YELLOW_RED_CARD: 'Segunda amarilla',
};

function minuteLabel(e: MatchEvent): string {
  return e.extraTime ? `${e.minute}+${e.extraTime}'` : `${e.minute}'`;
}

function shortName(full: string): string {
  // "Morata, Álvaro" → "Morata" · "Lamine Yamal" → "Lamine Yamal" (already short)
  const parts = full.split(',');
  return parts[0].trim();
}

interface Props {
  events: MatchEvent[];
  homeTeamId: string | null;
  awayTeamId: string | null;
}

export function MatchEvents({ events, homeTeamId, awayTeamId }: Props) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin eventos registrados aún.</p>;
  }

  return (
    <ol className="space-y-1.5 text-sm">
      {events.map((e, i) => {
        const isHome = e.teamId === homeTeamId;
        return (
          <li key={i} className={`flex items-start gap-2 ${isHome ? '' : 'flex-row-reverse text-right'}`}>
            <span className="shrink-0 w-14 font-mono text-xs text-muted-foreground pt-0.5 tabular-nums">
              {minuteLabel(e)}
            </span>
            <span className="shrink-0">{EVENT_ICON[e.type]}</span>
            <span>
              <span className="font-medium">{shortName(e.playerName)}</span>
              {e.type !== 'GOAL' && (
                <span className="text-muted-foreground"> · {EVENT_LABEL[e.type]}</span>
              )}
              {e.type === 'OWN_GOAL' && (
                <span className="text-muted-foreground"> (propia)</span>
              )}
              {e.detail && (
                <span className="text-muted-foreground text-xs"> · asist. {shortName(e.detail)}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
