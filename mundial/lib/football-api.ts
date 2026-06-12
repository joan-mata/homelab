const BASE = 'https://api.football-data.org/v4';
const COMPETITION_ID = 2000;

let lastCall = 0;

async function apiFetch(path: string) {
  const elapsed = Date.now() - lastCall;
  if (elapsed < 6000) await new Promise(r => setTimeout(r, 6000 - elapsed));
  lastCall = Date.now();

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY ?? '' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${path}`);
  return res.json();
}

export const fetchAllMatches = () => apiFetch(`/competitions/${COMPETITION_ID}/matches`);
export const fetchMatch      = (id: string) => apiFetch(`/matches/${id}`);
export const fetchStandings  = () => apiFetch(`/competitions/${COMPETITION_ID}/standings`);

export type MatchEvent = {
  minute: number;
  extraTime?: number;
  type: 'GOAL' | 'OWN_GOAL' | 'PENALTY' | 'YELLOW_CARD' | 'RED_CARD' | 'YELLOW_RED_CARD';
  teamId: string;
  playerName: string;
  detail?: string; // asistencia en goles
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMatchEvents(data: any): MatchEvent[] {
  const events: MatchEvent[] = [];

  for (const g of data.goals ?? []) {
    events.push({
      minute:     g.minute ?? 0,
      extraTime:  g.injuryTime ?? undefined,
      type:       g.type === 'OWN_GOAL' ? 'OWN_GOAL' : g.type === 'PENALTY' ? 'PENALTY' : 'GOAL',
      teamId:     g.team?.tla ?? '',
      playerName: g.scorer?.name ?? '',
      detail:     g.assist?.name ?? undefined,
    });
  }

  for (const b of data.bookings ?? []) {
    events.push({
      minute:     b.minute ?? 0,
      type:       b.card === 'RED_CARD' ? 'RED_CARD' : b.card === 'YELLOW_RED_CARD' ? 'YELLOW_RED_CARD' : 'YELLOW_CARD',
      teamId:     b.team?.tla ?? '',
      playerName: b.player?.name ?? '',
    });
  }

  return events.sort((a, b) => a.minute - b.minute || (a.extraTime ?? 0) - (b.extraTime ?? 0));
}

// Maps football-data.org status to our MatchStatus enum
export function mapStatus(status: string): 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' {
  if (status === 'FINISHED' || status === 'AWARDED') return 'FINISHED';
  if (status === 'IN_PLAY' || status === 'PAUSED' || status === 'EXTRA_TIME' || status === 'PENALTY_SHOOTOUT') return 'LIVE';
  if (status === 'POSTPONED' || status === 'CANCELLED' || status === 'SUSPENDED') return 'POSTPONED';
  return 'SCHEDULED';
}

// Maps football-data.org stage to our Stage enum
export function mapStage(stage: string): 'GROUP' | 'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER' | 'SEMI' | 'THIRD' | 'FINAL' {
  if (stage === 'GROUP_STAGE') return 'GROUP';
  if (stage === 'ROUND_OF_32' || stage === 'LAST_32') return 'ROUND_OF_32';
  if (stage === 'ROUND_OF_16' || stage === 'LAST_16') return 'ROUND_OF_16';
  if (stage === 'QUARTER_FINALS') return 'QUARTER';
  if (stage === 'SEMI_FINALS') return 'SEMI';
  if (stage === 'THIRD_PLACE') return 'THIRD';
  if (stage === 'FINAL') return 'FINAL';
  return 'GROUP';
}

// TLA (3-letter) → ISO 3166-1 alpha-2 mapping for flag emojis
const TLA_TO_ISO2: Record<string, string> = {
  ALG: 'DZ', ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE', BIH: 'BA',
  BRA: 'BR', CAN: 'CA', CIV: 'CI', COD: 'CD', COL: 'CO', CPV: 'CV',
  CRO: 'HR', CUR: 'CW', CUW: 'CW', CZE: 'CZ', ECU: 'EC', EGY: 'EG',
  ENG: 'GB', ESP: 'ES', FRA: 'FR', GER: 'DE', GHA: 'GH', HAI: 'HT',
  IRN: 'IR', IRQ: 'IQ', JOR: 'JO', JPN: 'JP', KOR: 'KR', KSA: 'SA',
  MAR: 'MA', MEX: 'MX', NED: 'NL', NOR: 'NO', NZL: 'NZ', PAN: 'PA',
  PAR: 'PY', POR: 'PT', QAT: 'QA', RSA: 'ZA', SCO: 'GB', SEN: 'SN',
  SUI: 'CH', SWE: 'SE', TUN: 'TN', TUR: 'TR', URY: 'UY', USA: 'US',
  UZB: 'UZ', WAL: 'GB', NIR: 'GB', IRL: 'IE', SVK: 'SK', SVN: 'SI',
  GRE: 'GR', ROM: 'RO', SRB: 'RS', UKR: 'UA', CHI: 'CL', PER: 'PE',
  VEN: 'VE', BOL: 'BO', HON: 'HN', SLV: 'SV', CRC: 'CR', TRI: 'TT',
  JAM: 'JM', CUB: 'CU', GUA: 'GT', NCA: 'NI',
};

function iso2Flag(iso2: string): string {
  return iso2.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
}

// Parse API placeholder names like "Winner Group A" → "1A", "Runner-up Group B" → "2B"
export function parseTeamLabel(name: string | null | undefined): string | null {
  if (!name) return null;
  const winMatch    = name.match(/[Ww]inner\s+[Gg]roup\s+([A-L])/);
  const runnerMatch = name.match(/[Rr]unner[- ][Uu]p\s+[Gg]roup\s+([A-L])/);
  const thirdMatch  = name.match(/[Tt]hird[- ][Pp]lac[a-z]+\s+[Gg]roup\s+([A-L/]+)/);
  if (winMatch)    return `1${winMatch[1]}`;
  if (runnerMatch) return `2${runnerMatch[1]}`;
  if (thirdMatch)  return `3${thirdMatch[1].replace(/\//g, '')}`;
  return null;
}

// Human-readable label: "1A" → "1º Grupo A", "3ABCD" → "3er Grupos A/B/C/D"
export function labelText(label: string): string {
  const pos = label[0];
  const groups = label.slice(1).split('').join('/');
  const ordinal = pos === '1' ? '1º' : pos === '2' ? '2º' : '3er';
  return `${ordinal} Grupo${groups.length > 1 ? 's' : ''} ${groups}`;
}

export function countryFlag(tla: string): string {
  const iso2 = TLA_TO_ISO2[tla.toUpperCase()];
  if (iso2) return iso2Flag(iso2);
  // Fallback: use first 2 letters if no mapping
  return iso2Flag(tla.slice(0, 2).toUpperCase());
}
