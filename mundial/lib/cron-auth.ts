export function checkCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('Authorization') === `Bearer ${secret}`;
}
