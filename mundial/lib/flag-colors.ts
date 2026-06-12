// Approximate flag gradients for 48 FIFA team IDs used in this tournament.
// dir 'h' → horizontal stripes (gradient to bottom)
// dir 'v' → vertical stripes (gradient to right)
// dir 'd' → diagonal (135deg), for diagonal-design flags
// dir 'r' → radial circle (center dot on background), colors[0]=dot, colors[1]=bg

type FlagDef = { dir: 'h' | 'v' | 'd' | 'r'; colors: string[] };

const FLAGS: Record<string, FlagDef> = {
  ALG: { dir: 'v', colors: ['#006233', '#FFFFFF'] },                      // Algeria: vertical green | white
  ARG: { dir: 'h', colors: ['#74ACDF', '#FFFFFF', '#74ACDF'] },           // Argentina: light-blue / white / light-blue
  AUS: { dir: 'h', colors: ['#00008B', '#CC0000', '#FFFFFF'] },           // Australia: navy / red (Union Jack accent)
  AUT: { dir: 'h', colors: ['#ED2939', '#FFFFFF', '#ED2939'] },           // Austria: red / white / red
  BEL: { dir: 'v', colors: ['#1A1A1A', '#FAE042', '#EF3340'] },           // Belgium: black / yellow / red (vertical)
  BIH: { dir: 'd', colors: ['#003DA5', '#FFCB00', '#003DA5'] },           // Bosnia: blue / yellow diagonal stripe
  BRA: { dir: 'h', colors: ['#009C3B', '#FEDF00', '#009C3B'] },           // Brazil: green / yellow / green
  CAN: { dir: 'v', colors: ['#FF0000', '#FFFFFF', '#FF0000'] },           // Canada: red / white / red (vertical)
  CPV: { dir: 'h', colors: ['#003893', '#CF2027', '#FFFFFF'] },           // Cape Verde: blue / red / white
  CIV: { dir: 'v', colors: ['#F77F00', '#FFFFFF', '#009A44'] },           // Ivory Coast: orange / white / green (vertical)
  COD: { dir: 'd', colors: ['#007ACC', '#F7D618', '#CE1020'] },           // Congo DR: diagonal blue→yellow→red
  COL: { dir: 'h', colors: ['#FCD116', '#003087', '#CE1126'] },           // Colombia: yellow / blue / red
  CRO: { dir: 'h', colors: ['#FF0000', '#FFFFFF', '#003DA5'] },           // Croatia: red / white / blue
  CUW: { dir: 'h', colors: ['#002B7F', '#002B7F', '#F9E814', '#002B7F'] }, // Curaçao: blue / thin yellow stripe / blue
  CZE: { dir: 'h', colors: ['#FFFFFF', '#D7141A'] },                      // Czechia: white / red
  ECU: { dir: 'h', colors: ['#FFD100', '#034EA2', '#EF3340'] },           // Ecuador: yellow / blue / red
  EGY: { dir: 'h', colors: ['#CE1126', '#FFFFFF', '#000000'] },           // Egypt: red / white / black
  ENG: { dir: 'v', colors: ['#FFFFFF', '#CF142B', '#FFFFFF'] },           // England: white / red cross / white
  ESP: { dir: 'h', colors: ['#AA151B', '#F1BF00', '#AA151B'] },           // Spain: red / yellow / red
  FRA: { dir: 'v', colors: ['#002395', '#FFFFFF', '#ED2939'] },           // France: blue / white / red (vertical)
  GER: { dir: 'h', colors: ['#000000', '#DD0000', '#FFCE00'] },           // Germany: black / red / gold
  GHA: { dir: 'h', colors: ['#EF3340', '#FCD116', '#006B3F'] },           // Ghana: red / gold / green
  HAI: { dir: 'h', colors: ['#003F87', '#D21034'] },                      // Haiti: royal blue / red (distinct from AUS)
  IRN: { dir: 'h', colors: ['#239F40', '#FFFFFF', '#DA0000'] },           // Iran: green / white / red
  IRQ: { dir: 'h', colors: ['#CE1126', '#FFFFFF', '#000000'] },           // Iraq: red / white / black
  JOR: { dir: 'h', colors: ['#000000', '#FFFFFF', '#007A3D'] },           // Jordan: black / white / green
  JPN: { dir: 'r', colors: ['#BC002D', '#FFFFFF'] },                       // Japan: red circle on white
  KOR: { dir: 'h', colors: ['#FFFFFF', '#CD2E3A', '#003478'] },           // South Korea: white / red / blue
  KSA: { dir: 'h', colors: ['#006C35'] },                                 // Saudi Arabia: solid green
  MAR: { dir: 'h', colors: ['#C1272D'] },                                 // Morocco: almost entirely red
  MEX: { dir: 'v', colors: ['#006847', '#FFFFFF', '#CE1126'] },           // Mexico: green / white / red (vertical)
  NED: { dir: 'h', colors: ['#AE1C28', '#FFFFFF', '#21468B'] },           // Netherlands: red / white / blue
  NOR: { dir: 'h', colors: ['#EF2B2D', '#FFFFFF', '#002868'] },           // Norway: red / white / dark blue
  NZL: { dir: 'h', colors: ['#00247D', '#FFFFFF', '#CC0000'] },           // New Zealand: navy / white / red (distinct from AUS)
  PAN: { dir: 'd', colors: ['#FFFFFF', '#DA121A', '#0052A5'] },           // Panama: white + red & blue quadrants
  PAR: { dir: 'h', colors: ['#D52B1E', '#FFFFFF', '#0038A8'] },           // Paraguay: red / white / blue
  POR: { dir: 'v', colors: ['#006600', '#FF0000'] },                      // Portugal: green / red (vertical)
  QAT: { dir: 'v', colors: ['#FFFFFF', '#8B1538', '#8B1538', '#8B1538'] }, // Qatar: white (narrow) / maroon (wide)
  RSA: { dir: 'h', colors: ['#DE3831', '#007A4D', '#002395'] },           // South Africa: red / green / blue
  SCO: { dir: 'd', colors: ['#003078', '#FFFFFF', '#003078'] },           // Scotland: white X on blue (diagonal hint)
  SEN: { dir: 'v', colors: ['#00853F', '#FDEF42', '#E31B23'] },           // Senegal: green / yellow / red (vertical)
  SUI: { dir: 'h', colors: ['#FF0000', '#FFFFFF', '#FF0000'] },           // Switzerland: red / white cross / red
  SWE: { dir: 'v', colors: ['#006AA7', '#FECC02', '#006AA7'] },           // Sweden: blue / yellow cross / blue
  TUN: { dir: 'h', colors: ['#E70013'] },                                 // Tunisia: solid red           // Tunisia: red / white (crescent) / red
  TUR: { dir: 'h', colors: ['#E30A17'] },                                 // Turkey: solid red           // Turkey: red / white (crescent) / red
  URY: { dir: 'h', colors: ['#FFFFFF', '#5EB6E4', '#FFFFFF', '#5EB6E4', '#FFFFFF', '#5EB6E4', '#FFFFFF', '#5EB6E4', '#FFFFFF'] }, // Uruguay: 9 stripes blanco/celeste
  USA: { dir: 'h', colors: ['#B22234', '#FFFFFF', '#3C3B6E'] },           // USA: red / white / blue
  UZB: { dir: 'h', colors: ['#1EBFAE', '#FFFFFF', '#1EB53A'] },           // Uzbekistan: teal / white / green
};

function hex2rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Returns a CSS gradient string for the given team's flag at the given opacity. */
export function flagGradient(teamId: string | null | undefined, opacity = 0.20): string {
  const f = FLAGS[teamId ?? ''];
  if (!f) return 'none';
  if (f.dir === 'r') {
    // Radial circle: colors[0]=circle, colors[1]=background
    const dot = hex2rgba(f.colors[0], opacity);
    const bg  = hex2rgba(f.colors[1] ?? '#FFFFFF', opacity);
    return `radial-gradient(circle 33% at 50% 50%, ${dot} 0%, ${dot} 100%, ${bg} 100%)`;
  }
  const dir = f.dir === 'h' ? 'to bottom' : f.dir === 'v' ? 'to right' : '135deg';
  const n = f.colors.length;
  const stops = f.colors.flatMap((c, i) => {
    const col = hex2rgba(c, opacity);
    return [`${col} ${((i / n) * 100).toFixed(1)}%`, `${col} ${(((i + 1) / n) * 100).toFixed(1)}%`];
  });
  return `linear-gradient(${dir}, ${stops.join(', ')})`;
}

/**
 * CSS background props for a split card (left = home, right = away).
 * Apply as inline style on the card element.
 */
export function splitFlagBackground(
  homeId: string | null | undefined,
  awayId: string | null | undefined,
  opacity = 0.20,
): Record<string, string> {
  const home = flagGradient(homeId, opacity);
  const away = flagGradient(awayId, opacity);
  if (home === 'none' && away === 'none') return {};
  return {
    backgroundImage: [home, away].filter(g => g !== 'none').join(', '),
    backgroundSize:  home !== 'none' && away !== 'none'
      ? '50% 100%, 50% 100%'
      : '100% 100%',
    backgroundPosition: home !== 'none' && away !== 'none'
      ? 'left top, right top'
      : 'left top',
    backgroundRepeat: 'no-repeat',
  };
}

// For single-team rows (bracket slots)
export function rowFlagBackground(teamId: string | null | undefined, opacity = 0.18): Record<string, string> {
  const g = flagGradient(teamId, opacity);
  if (g === 'none') return {};
  return { backgroundImage: g, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pixel-art flag system.
// Each entry is a function (x, y) ∈ [0,1]² → hex color, evaluated per cell.
// This lets any flag pattern (stripes, crosses, circles, diagonals) be rendered
// as a small grid of solid-color squares — pixel-art style.
// ─────────────────────────────────────────────────────────────────────────────
type FF = (x: number, y: number) => string;

// ── Combinators ──────────────────────────────────────────────────────────────
const _hs = (...c: string[]): FF => (_, y) => c[Math.min(Math.floor(y * c.length), c.length - 1)];
const _vs = (...c: string[]): FF => (x)    => c[Math.min(Math.floor(x * c.length), c.length - 1)];
const _diag = (a: string, b: string): FF => (x, y) => x + y < 1 ? a : b;
const _circ = (bg: string, d: string, r = 0.27): FF => (x, y) =>
  (x - 0.5) ** 2 + (y - 0.5) ** 2 < r * r ? d : bg;
const _plus = (bg: string, cr: string, vw = 0.14, hw = 0.19): FF => (x, y) =>
  Math.abs(x - 0.5) < vw || Math.abs(y - 0.5) < hw ? cr : bg;
const _xcr  = (bg: string, cr: string, w = 0.13): FF => (x, y) =>
  Math.abs(x - y) < w || Math.abs(x + y - 1) < w ? cr : bg;

// ── Per-team pixel functions ──────────────────────────────────────────────────
const PFLAG: Record<string, FF> = {
  ALG: _vs('#006233', '#FFFFFF'),
  ARG: _hs('#74ACDF', '#FFFFFF', '#74ACDF'),
  AUS: (x, y) => {
    // Union Jack in top-left canton, rest navy
    if (x < 0.42 && y < 0.52) {
      const cx = x / 0.42, cy = y / 0.52;
      return (Math.abs(cx - 0.5) < 0.18 || Math.abs(cy - 0.5) < 0.22) ? '#CF142B' : '#00247D';
    }
    return '#00247D';
  },
  AUT: _hs('#ED2939', '#FFFFFF', '#ED2939'),
  BEL: _vs('#1A1A1A', '#FAE042', '#EF3340'),
  BIH: (x, y) => y < x ? '#FFCB00' : '#003DA5',
  BRA: (x, y) => Math.abs(x - 0.5) + Math.abs(y - 0.5) * 0.8 < 0.38 ? '#FEDF00' : '#009C3B',
  CAN: _vs('#FF0000', '#FFFFFF', '#FF0000'),
  CPV: _hs('#003893', '#CF2027', '#003893'),
  CIV: _vs('#F77F00', '#FFFFFF', '#009A44'),
  COD: (x, y) => {
    const d = Math.abs(x + y - 1);
    if (d < 0.16) return '#CE1020';
    if (d < 0.21) return '#F7D618';
    if ((x - 0.12) ** 2 + (y - 0.14) ** 2 < 0.008) return '#F7D618';
    return '#007ACC';
  },
  COL: _hs('#FCD116', '#003087', '#CE1126'),
  CRO: _hs('#FF0000', '#FFFFFF', '#003DA5'),
  CUW: (x, y) => {
    if (y > 0.62 && y < 0.75) return '#F9E814';
    if ((Math.abs(x - 0.14) < 0.07 && Math.abs(y - 0.20) < 0.09) ||
        (Math.abs(x - 0.27) < 0.07 && Math.abs(y - 0.36) < 0.09)) return '#FFFFFF';
    return '#002B7F';
  },
  CZE: (x, y) => x < 0.5 && y > x && y < 1 - x ? '#003399' : y < 0.5 ? '#FFFFFF' : '#D7141A',
  ECU: _hs('#FFD100', '#034EA2', '#EF3340'),
  EGY: _hs('#CE1126', '#FFFFFF', '#000000'),
  ENG: _plus('#FFFFFF', '#CF142B'),
  ESP: (x, y) => y < 0.25 || y > 0.75 ? '#AA151B' : '#F1BF00',
  FRA: _vs('#002395', '#FFFFFF', '#ED2939'),
  GER: _hs('#000000', '#DD0000', '#FFCE00'),
  GHA: _hs('#EF3340', '#FCD116', '#006B3F'),
  HAI: _hs('#003F87', '#D21034'),
  IRN: _hs('#239F40', '#FFFFFF', '#DA0000'),
  IRQ: _hs('#CE1126', '#FFFFFF', '#000000'),
  JOR: (x, y) => x < 0.5 && y > x && y < 1 - x ? '#CE1126' : _hs('#000000', '#FFFFFF', '#007A3D')(x, y),
  JPN: _circ('#FFFFFF', '#BC002D', 0.30),
  KOR: _circ('#FFFFFF', '#CD2E3A', 0.30),
  KSA: () => '#006C35',
  MAR: () => '#C1272D',
  MEX: _vs('#006847', '#FFFFFF', '#CE1126'),
  NED: _hs('#AE1C28', '#FFFFFF', '#21468B'),
  NOR: (x, y) => {
    const dv = Math.abs(x - 0.37), dh = Math.abs(y - 0.5);
    return dv < 0.065 || dh < 0.10 ? '#002868'
      : dv < 0.130 || dh < 0.19 ? '#FFFFFF'
      : '#EF2B2D';
  },
  NZL: (x, y) => {
    // Union Jack in top-left canton (like AUS), Southern Cross stars (right side)
    if (x < 0.42 && y < 0.52) {
      const cx = x / 0.42, cy = y / 0.52;
      return (Math.abs(cx - 0.5) < 0.18 || Math.abs(cy - 0.5) < 0.22) ? '#CF142B' : '#00247D';
    }
    const stars: [number, number][] = [[0.62, 0.22], [0.84, 0.42], [0.63, 0.68], [0.52, 0.4]];
    for (const [sx, sy] of stars) {
      if (Math.abs(x - sx) < 0.07 && Math.abs(y - sy) < 0.09) return '#CC0000';
    }
    return '#00247D';
  },
  PAN: (x, y) => x < 0.5 ? (y < 0.5 ? '#FFFFFF' : '#DA121A') : (y < 0.5 ? '#0052A5' : '#FFFFFF'),
  PAR: _hs('#D52B1E', '#FFFFFF', '#0038A8'),
  POR: _vs('#006600', '#FF0000'),
  QAT: (x, y) => x < 0.22 ? '#FFFFFF' : '#8B1538',
  RSA: (x, y) => {
    if (Math.abs(y - 0.5) < 0.13 + x * 0.28) return '#007A4D'; // green Y (widens right)
    if (x < 0.38) return '#000000';                              // black left triangle
    return y < 0.5 ? '#DE3831' : '#002395';                     // red top, blue bottom
  },
  SCO: _xcr('#003078', '#FFFFFF', 0.13),
  SEN: _vs('#00853F', '#FDEF42', '#E31B23'),
  SUI: (x, y) =>
    (Math.abs(x - 0.5) < 0.15 && Math.abs(y - 0.5) < 0.31) ||
    (Math.abs(y - 0.5) < 0.15 && Math.abs(x - 0.5) < 0.31)
      ? '#FFFFFF' : '#FF0000',
  SWE: (x, y) => Math.abs(x - 0.38) < 0.08 || Math.abs(y - 0.5) < 0.13 ? '#FECC02' : '#006AA7',
  TUN: (x, y) => {
    if ((x - 0.5) ** 2 + (y - 0.5) ** 2 > 0.075) return '#E70013'; // red bg
    const outer = (x - 0.47) ** 2 + (y - 0.5) ** 2 < 0.038;
    const inner = (x - 0.54) ** 2 + (y - 0.5) ** 2 < 0.026;
    if (outer && !inner) return '#E70013'; // red crescent
    if ((x - 0.59) ** 2 + (y - 0.5) ** 2 < 0.007) return '#E70013'; // red star
    return '#FFFFFF'; // white circle
  },
  TUR: (x, y) => {
    const outer = (x - 0.37) ** 2 + (y - 0.5) ** 2 < 0.052;
    const inner = (x - 0.45) ** 2 + (y - 0.5) ** 2 < 0.036;
    if (outer && !inner) return '#FFFFFF';
    if ((x - 0.63) ** 2 + (y - 0.5) ** 2 < 0.009) return '#FFFFFF';
    return '#E30A17';
  },
  URY: (x, y) => {
    if (x < 0.37 && y < 0.556) return '#FFFFFF'; // cantón blanco (sol de mayo)
    return Math.floor(y * 9) % 2 === 0 ? '#FFFFFF' : '#5EB6E4';
  },
  USA: (x, y) => {
    if (x < 0.4 && y < 0.5) return '#3C3B6E'; // blue canton
    return Math.floor(y * 6) % 2 === 0 ? '#B22234' : '#FFFFFF'; // 6 visible stripes
  },
  UZB: _hs('#1EBFAE', '#FFFFFF', '#1EB53A'),
};

function flagToDataUrl(fn: FF, opacity: number, cols: number, rows: number): string {
  const parts: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hex = fn((c + 0.5) / cols, (r + 0.5) / rows);
      const rv = parseInt(hex.slice(1, 3), 16);
      const gv = parseInt(hex.slice(3, 5), 16);
      const bv = parseInt(hex.slice(5, 7), 16);
      parts.push(`%3Crect x='${c}' y='${r}' width='1' height='1' fill='rgba(${rv},${gv},${bv},${opacity})'/%3E`);
    }
  }
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${cols} ${rows}' preserveAspectRatio='none'%3E${parts.join('')}%3C/svg%3E`;
}

/**
 * Pixel-art flag background for match cards.
 * Home team fills the left half, away team the right half.
 * Each half is rendered as a cols×rows grid; each cell gets the flag color at its center.
 */
export function pixelBackground(
  homeId: string | null | undefined,
  awayId: string | null | undefined,
  opacity = 0.20,
  cols = 10,
  rows = 8,
): Record<string, string> {
  const hFn = PFLAG[homeId ?? ''];
  const aFn = PFLAG[awayId ?? ''];
  if (!hFn && !aFn) return {};
  if (hFn && aFn) {
    return {
      backgroundImage: `url("${flagToDataUrl(hFn, opacity, cols, rows)}"), url("${flagToDataUrl(aFn, opacity, cols, rows)}")`,
      backgroundSize: '50% 100%, 50% 100%',
      backgroundPosition: 'left top, right top',
      backgroundRepeat: 'no-repeat',
    };
  }
  const fn = (hFn ?? aFn)!;
  return {
    backgroundImage: `url("${flagToDataUrl(fn, opacity, cols, rows)}")`,
    backgroundSize: '100% 100%',
    backgroundPosition: '0 0',
    backgroundRepeat: 'no-repeat',
  };
}
