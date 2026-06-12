import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExtraReminderModal } from '@/components/extra-reminder-modal';

export const revalidate = 30;

const BET_LABELS: Record<string, string> = {
  WORLD_CUP_WINNER: 'Campeón del Mundial',
  TOP_SCORER:       'Máximo goleador',
  BEST_GOALKEEPER:  'Mejor portero',
};

export default async function DashboardPage() {
  const session = await auth();
  const users = await db.user.findMany({
    where: { active: true, role: 'USER' },
    include: {
      predictions: { where: { points: { not: null } } },
      extraBets:   { where: { resolved: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const userId  = session!.user.id;
  const isAdmin = session!.user.role === 'ADMIN';

  // Pending extras for reminder modal
  const pendingLabels: string[] = [];
  if (!isAdmin) {
    const [myBets, openContests, myPicks, deadlineSetting] = await Promise.all([
      db.extraBet.findMany({ where: { userId }, select: { type: true } }),
      db.teamPickContest.findMany({ where: { open: true }, select: { id: true, name: true } }),
      db.teamPickEntry.findMany({ where: { userId }, select: { contestId: true } }),
      db.setting.findUnique({ where: { key: 'extra_bet_deadline' } }),
    ]);
    const deadline   = new Date(deadlineSetting?.value ?? '2026-07-19T21:00:00Z');
    const myBetTypes = new Set(myBets.map(b => b.type));
    const myPickIds  = new Set(myPicks.map(e => e.contestId));
    if (new Date() < deadline) {
      for (const [type, label] of Object.entries(BET_LABELS)) {
        if (!myBetTypes.has(type as never)) pendingLabels.push(label);
      }
    }
    for (const c of openContests) {
      if (!myPickIds.has(c.id)) pendingLabels.push(c.name);
    }
  }

  const rows = users.map(u => {
    const predPts    = u.predictions.reduce((s, p) => s + (p.points ?? 0), 0);
    const extraPts   = u.extraBets.reduce((s, e) => s + (e.points ?? 0), 0);
    const total      = predPts + extraPts;
    const exact      = u.predictions.filter(p => p.basePoints === 3).length;
    const winner     = u.predictions.filter(p => p.basePoints === 1).length;
    const koBonusPts = u.predictions.reduce((s, p) => s + (p.knockoutPoints ?? 0), 0);
    const closestPts = u.predictions.reduce((s, p) => s + (p.closestBonus ?? 0), 0);
    const pending    = u.predictions.filter(p => p.points === null).length;
    return { ...u, total, predPts, extraPts, exact, winner, koBonusPts, closestPts, pending };
  }).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      {!isAdmin && <ExtraReminderModal pendingLabels={pendingLabels} />}
      <div>
        <h1 className="text-2xl font-bold">Clasificación</h1>
        <p className="text-muted-foreground text-sm mt-1">Se actualiza cada 30 segundos</p>
      </div>

      {/* ── Mobile list ────────────────────────────────── */}
      <div className="sm:hidden rounded-lg border overflow-hidden divide-y">
        {rows.map((u, i) => {
          const isMe = u.id === userId;
          const chips = [
            u.exact   > 0 && <span key="e" className="text-green-600">{u.exact} exacto{u.exact > 1 ? 's' : ''}</span>,
            u.winner  > 0 && <span key="w" className="text-yellow-600">{u.winner} ganador{u.winner > 1 ? 'es' : ''}</span>,
            u.closestPts > 0 && <span key="c" className="text-orange-500">+{u.closestPts} cerca</span>,
            u.koBonusPts > 0 && <span key="k" className="text-blue-600">+{u.koBonusPts} KO</span>,
            u.extraPts > 0 && <span key="x" className="text-purple-600">+{u.extraPts} extra</span>,
          ].filter(Boolean);
          return (
            <div key={u.id} className={`flex items-center gap-3 px-3 py-2.5 ${isMe ? 'bg-primary/5' : ''}`}>
              <span className="shrink-0 w-7 text-center text-base leading-none">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-sm text-muted-foreground">{i + 1}</span>}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`truncate text-sm ${isMe ? 'font-semibold' : 'font-medium'}`}>{u.name}</span>
                  {u.favoriteTeam && <span className="shrink-0 text-sm">{u.favoriteTeam}</span>}
                  {isMe && <Badge variant="secondary" className="text-[10px] shrink-0 py-0">Tú</Badge>}
                </div>
                {chips.length > 0 ? (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs">
                    {chips}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin puntos aún</span>
                )}
              </div>
              <span className={`shrink-0 text-2xl font-bold tabular-nums ${isMe ? 'text-primary' : ''}`}>{u.total}</span>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ───────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Jugador</th>
              <th className="px-4 py-3 text-right font-bold">Pts</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Exactos</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Ganador</th>
              <th className="px-4 py-3 text-right hidden md:table-cell" title="Acierta quién pasa de ronda (+1), método prórroga (+1), marcador ET exacto (+3)">Bonus KO</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Más cerca</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Extras</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">Pendientes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((u, i) => {
              const isMe = u.id === userId;
              return (
                <tr key={u.id} className={isMe ? 'ranking-me font-medium' : 'hover:bg-accent/50 transition-colors'}>
                  <td className="px-4 py-3 text-muted-foreground">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.name}
                      {u.favoriteTeam && <span className="text-base">{u.favoriteTeam}</span>}
                      {isMe && <Badge variant="secondary" className="text-xs">Tú</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lg">{u.total}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell text-green-600">{u.exact}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell text-yellow-600">{u.winner}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-blue-600">{u.koBonusPts > 0 ? `+${u.koBonusPts}` : '-'}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-orange-500">{u.closestPts > 0 ? `+${u.closestPts}` : '-'}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-purple-600">{u.extraPts > 0 ? `+${u.extraPts}` : '-'}</td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground">{u.pending}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><span className="text-green-600 font-medium">Exactos</span> = 3 pts</span>
        <span className="opacity-30">·</span>
        <span><span className="text-yellow-600 font-medium">Ganador</span> = 1 pt</span>
        <span className="opacity-30">·</span>
        <span title="Acierta quién pasa de ronda (+1), método prórroga (+1), marcador ET exacto (+3)"><span className="text-blue-600 font-medium">Bonus KO</span> = hasta +5 pts</span>
        <span className="opacity-30">·</span>
        <span><span className="text-red-500 font-medium">Favorito</span> = +1 pt</span>
        <span className="opacity-30">·</span>
        <span><span className="text-orange-500 font-medium">Más cerca</span> = +1 pt</span>
      </div>
    </div>
  );
}
