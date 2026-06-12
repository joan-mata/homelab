import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EditUserForm } from '@/components/admin/edit-user-form';

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, username: true, active: true, favoriteTeam: true,
      telegramChatId: true, telegramToken: true,
      predictions: {
        include: { match: true },
        orderBy: { match: { kickoff: 'desc' } },
        take: 10,
      },
    },
  });
  if (!user) notFound();
  const hasTelegramToken = !!user.telegramToken;

  const totalPts = user.predictions.reduce((s, p) => s + (p.points ?? 0), 0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-muted-foreground">@{user.username}</p>
        <div className="flex gap-2 mt-2">
          {!user.active && <Badge variant="destructive">Inactivo</Badge>}
          {user.favoriteTeam && <Badge variant="secondary">Favorito: {user.favoriteTeam}</Badge>}
          {user.telegramChatId && <Badge variant="outline">Telegram: {user.telegramChatId}</Badge>}
          {user.telegramToken && <Badge variant="outline" className="text-xs">Bot configurado</Badge>}
        </div>
      </div>

      <EditUserForm user={{ id: user.id, name: user.name, telegramChatId: user.telegramChatId, hasTelegramToken, active: user.active, favoriteTeam: user.favoriteTeam }} />

      <Card>
        <CardHeader><CardTitle className="text-base">Últimas predicciones — {totalPts} pts total</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y text-sm">
            {user.predictions.map(p => (
              <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{p.match.homeTeamId ?? '?'} vs {p.match.awayTeamId ?? '?'}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.match.kickoff.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono">{p.homeScore}–{p.awayScore}</div>
                  {p.points !== null ? (
                    <span className={`text-xs font-bold ${p.basePoints === 3 ? 'text-green-600' : p.basePoints === 1 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                      {p.points} pts
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pendiente</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
