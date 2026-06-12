import cron from 'node-cron';

let initialized = false;

export function initCron(): void {
  if (initialized || process.env.NODE_ENV === 'test') return;
  initialized = true;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const secret = process.env.CRON_SECRET ?? '';

  const hit = (path: string) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    }).catch(e => console.error(`[cron] ${path}:`, e));

  // Sync resultados: cada 5 min de 14:00 a 23:59 UTC
  cron.schedule('*/5 14-23 * * *', () => hit('/api/cron/sync-results'));

  // Recordatorio: 20:00 UTC diario
  cron.schedule('0 20 * * *', () => hit('/api/cron/reminders'));

  // Sync fixture: 03:00 UTC diario
  cron.schedule('0 3 * * *', () => hit('/api/cron/sync-fixture'));

  // Morning summary: 09:00 CET (07:00 UTC en verano)
  cron.schedule('0 7 * * *', () => hit('/api/cron/morning-summary'));

  // Recordatorio pre-partido: cada 5 min para detectar partidos a 1h y al inicio
  cron.schedule('*/5 * * * *', () => hit('/api/cron/match-reminders'));

  // Eventos en vivo: cada 2 min durante horas de partido
  cron.schedule('*/2 14-23 * * *', () => hit('/api/cron/sync-events'));

  console.log('[cron] Jobs initialized');
}
