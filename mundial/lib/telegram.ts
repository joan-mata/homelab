import TelegramBot from 'node-telegram-bot-api';

function makeBot(token: string): TelegramBot {
  return new TelegramBot(token, { polling: false });
}

export type MatchResultNotif = {
  matchDesc: string;
  predDesc: string;
  basePoints: number;
  knockoutPoints: number;
  favBonus: number;
  totalPoints: number;
};

export async function notifyMatchResult(chatId: string, token: string, n: MatchResultNotif): Promise<void> {
  const breakdown = [
    `Resultado base: *${n.basePoints} pts*`,
    n.knockoutPoints > 0 ? `Bonus eliminatoria: *+${n.knockoutPoints} pts*` : null,
    n.favBonus > 0       ? `Bonus favorito: *+${n.favBonus} pt*` : null,
  ].filter(Boolean).join('\n');

  await makeBot(token).sendMessage(
    chatId,
    `⚽ *${n.matchDesc}*\n_${n.predDesc}_\n\n${breakdown}\n\nTotal acumulado: *${n.totalPoints} pts*`,
    { parse_mode: 'Markdown' }
  );
}

export async function remindMissingPredictions(
  chatId: string,
  token: string,
  matches: Array<{ homeTeam: string; awayTeam: string; kickoff: Date }>
): Promise<void> {
  const lines = matches.map(m => {
    const time = m.kickoff.toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid'
    });
    return `• ${m.homeTeam} vs ${m.awayTeam} — ${time}h`;
  });
  await makeBot(token).sendMessage(
    chatId,
    `⏰ Partidos mañana sin tu predicción:\n\n${lines.join('\n')}\n\nhttps://mundial.joanmata.com/matches`,
    { parse_mode: 'Markdown' }
  );
}

export type MorningSummaryParams = {
  todayMatches: Array<{ homeTeam: string; awayTeam: string; kickoff: Date; matchId: string }>;
  missingIds: Set<string>;
  yesterday: { pts: number; rank: number; totalPlayers: number; myTotal: number };
};

export async function sendMorningSummary(
  chatId: string,
  token: string,
  { todayMatches, missingIds, yesterday }: MorningSummaryParams
): Promise<void> {
  const lines: string[] = [];

  if (todayMatches.length === 0) {
    lines.push('No hay partidos hoy.');
  } else {
    for (const m of todayMatches) {
      const time = m.kickoff.toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid'
      });
      const icon = missingIds.has(m.matchId) ? '⚠️' : '✅';
      lines.push(`${icon} ${m.homeTeam} vs ${m.awayTeam} — ${time} h`);
    }
  }

  const yesterdayLine = yesterday.pts > 0
    ? `\n📊 Ayer sumaste *${yesterday.pts} pts*`
    : `\n📊 Ayer no sumaste puntos`;

  const rankLine = `\n🏆 Clasificación: *Nº ${yesterday.rank} de ${yesterday.totalPlayers}* (${yesterday.myTotal} pts)`;

  const text = `⚽ *Partidos de hoy*\n\n${lines.join('\n')}${yesterdayLine}${rankLine}\n\nhttps://mundial.joanmata.com/matches`;

  await makeBot(token).sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

export async function sendWelcomeMessage(chatId: string, token: string, name: string): Promise<void> {
  await makeBot(token).sendMessage(
    chatId,
    `👋 Hola *${name}*, Telegram conectado correctamente.\n\nA partir de ahora recibirás recordatorios de partidos y resultados aquí.`,
    { parse_mode: 'Markdown' }
  );
}

export async function remindBeforeKickoff(
  chatId: string,
  token: string,
  { homeTeam, awayTeam, minutesLeft }: { homeTeam: string; awayTeam: string; minutesLeft: number; kickoff: Date }
): Promise<void> {
  const text = minutesLeft >= 1
    ? `⏰ *${homeTeam} vs ${awayTeam}* empieza en ~${minutesLeft} min — ¡falta tu predicción!\n\nhttps://mundial.joanmata.com/matches`
    : `🚨 *${homeTeam} vs ${awayTeam}* empieza ahora — ¡falta tu predicción!\n\nhttps://mundial.joanmata.com/matches`;

  await makeBot(token).sendMessage(chatId, text, { parse_mode: 'Markdown' });
}
