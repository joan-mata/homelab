import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { effectiveDeadline } from '@/lib/deadline';
import { formatKickoff, stageLabel, methodLabel } from '@/lib/utils';
import { PredictionForm } from '@/components/prediction-form';
import { LiveRefresher } from '@/components/live-refresher';
import { MatchEvents } from '@/components/match-events';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MatchEvent } from '@/lib/football-api';
import Link from 'next/link';

function liveScore(events: MatchEvent[], homeId: string | null, awayId: string | null) {
  let home = 0, away = 0;
  for (const e of events) {
    if (e.type === 'GOAL' || e.type === 'PENALTY') {
      if (e.teamId === homeId) home++; else away++;
    } else if (e.type === 'OWN_GOAL') {
      if (e.teamId === homeId) away++; else home++;
    }
  }
  return { home, away };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId   = session!.user.id;
  const isAdmin  = session!.user.role === 'ADMIN';

  const match = await db.match.findUnique({ where: { id } });
  if (!match) notFound();

  const [homeTeam, awayTeam] = await Promise.all([
    match.homeTeamId ? db.team.findUnique({ where: { id: match.homeTeamId } }) : null,
    match.awayTeamId ? db.team.findUnique({ where: { id: match.awayTeamId } }) : null,
  ]);

  const prediction = isAdmin ? null : await db.prediction.findUnique({ where: { userId_matchId: { userId, matchId: id } } });
  const deadline   = isAdmin ? new Date(0) : await effectiveDeadline(id, userId);
  const now        = new Date();
  const isOpen     = !isAdmin && now < deadline && match.status === 'SCHEDULED';
  const hasResult  = match.homeScore !== null && match.awayScore !== null;
  const isKnockout = match.stage !== 'GROUP';

  const deadlinePassed = now >= deadline || match.status !== 'SCHEDULED';

  // Fetch all users' predictions for this match
  const canSeePredictions = isAdmin || !!prediction || deadlinePassed;
  const allPredictions = canSeePredictions ? await db.prediction.findMany({
    where:   { matchId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: 'asc' } },
  }) : [];

  // Users who have predicted (always visible for count)
  const predictorIds = canSeePredictions
    ? new Set(allPredictions.map(p => p.userId))
    : await db.prediction.findMany({ where: { matchId: id }, select: { userId: true } })
        .then(ps => new Set(ps.map(p => p.userId)));

  const allUsers = await db.user.findMany({
    where: { active: true, role: 'USER' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {match.status === 'LIVE' && <LiveRefresher />}
      <Link href="/matches" className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors mb-2 w-fit">
        ← Volver
      </Link>
      <div>
        <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
          <span>{stageLabel(match.stage)}</span>
          {match.group && <span>· Grupo {match.group.replace(/^GROUP_/, '')}</span>}
          {match.venueCity && <span>· {match.venueCity}</span>}
          {match.status === 'LIVE' && (
            <span className="flex items-center gap-1 text-red-500 font-semibold uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              En vivo
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold">
          {homeTeam ? `${homeTeam.flag} ${homeTeam.name}` : (match.homeTeamId ?? 'Por determinar')}
          {' vs '}
          {awayTeam ? `${awayTeam.name} ${awayTeam.flag}` : (match.awayTeamId ?? 'Por determinar')}
        </h1>
        {match.status === 'LIVE' && Array.isArray(match.events) && (() => {
          const s = liveScore(match.events as MatchEvent[], match.homeTeamId, match.awayTeamId);
          return (
            <div className="mt-2 text-3xl font-bold tabular-nums">
              {s.home} – {s.away}
            </div>
          );
        })()}
        {match.status !== 'LIVE' && (
          <p className="text-muted-foreground mt-1">{formatKickoff(match.kickoff)}</p>
        )}
      </div>

      {hasResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado final</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-center">
              {match.homeScore} – {match.awayScore}
            </div>
            {match.knockoutMethod && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                {methodLabel(match.knockoutMethod)}
                {match.etHomeScore !== null && ` (${match.etHomeScore}–${match.etAwayScore} tras prórroga)`}
                {match.knockoutWinnerId && ` · Avanza ${match.knockoutWinnerId}`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(match.status === 'LIVE' || hasResult) && Array.isArray(match.events) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {match.status === 'LIVE' && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              )}
              Eventos del partido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MatchEvents
              events={match.events as MatchEvent[]}
              homeTeamId={match.homeTeamId}
              awayTeamId={match.awayTeamId}
            />
          </CardContent>
        </Card>
      )}

      {!isAdmin && prediction && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tu predicción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">{prediction.homeScore} – {prediction.awayScore}</div>
            {prediction.knockoutWinnerId && (
              <p className="text-sm text-muted-foreground">
                Avance: {prediction.knockoutWinnerId}
                {prediction.knockoutMethod && ` por ${methodLabel(prediction.knockoutMethod)}`}
                {prediction.etHomeScore !== null && ` (${prediction.etHomeScore}–${prediction.etAwayScore} ET)`}
              </p>
            )}
            {prediction.points !== null && (
              <div className="flex gap-3 text-sm pt-2 border-t">
                <span>Base: <strong>{prediction.basePoints}</strong></span>
                {(prediction.knockoutPoints ?? 0) > 0 && <span>KO: <strong>+{prediction.knockoutPoints}</strong></span>}
                <span className="font-bold text-primary">Total: {prediction.points} pts</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isOpen ? (
        <PredictionForm
          matchId={id}
          homeTeamId={match.homeTeamId}
          awayTeamId={match.awayTeamId}
          homeTeamName={homeTeam?.name ?? null}
          awayTeamName={awayTeam?.name ?? null}
          isKnockout={isKnockout}
          deadline={deadline}
          existing={prediction ?? undefined}
        />
      ) : !isAdmin && !isOpen && match.status === 'SCHEDULED' && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>El plazo de predicción ha cerrado.</p>
            <p className="text-sm mt-1">Cerró: {deadline.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</p>
          </CardContent>
        </Card>
      )}

      {/* Other users' predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Predicciones</span>
            <span className="text-sm font-normal text-muted-foreground">{predictorIds.size}/{allUsers.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canSeePredictions ? (
            <div className="divide-y text-sm">
              {allUsers.map(u => {
                const pred = allPredictions.find(p => p.userId === u.id);
                const isMe = u.id === userId;
                return (
                  <div key={u.id} className={`flex items-center justify-between py-2 ${isMe ? 'font-medium' : ''}`}>
                    <span>{u.name}{isMe && ' (tú)'}</span>
                    {pred ? (
                      <span className="font-mono">
                        {pred.homeScore}–{pred.awayScore}
                        {pred.points !== null && (
                          <span className={`ml-2 text-xs ${pred.points >= 3 ? 'text-green-600' : pred.points >= 1 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            {pred.points}pts
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Sin predicción</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {'Haz tu predicción para ver las de los demás.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {allUsers.map(u => (
                  <Badge key={u.id} variant={predictorIds.has(u.id) ? 'secondary' : 'outline'} className="text-xs">
                    {u.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
