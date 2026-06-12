import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await db.setting.findMany();
  return NextResponse.json(Object.fromEntries(settings.map(s => [s.key, s.value])));
}

const ALLOWED_SETTINGS = new Set([
  'extra_bet_deadline',
  'extra_open_WORLD_CUP_WINNER',
  'extra_open_TOP_SCORER',
  'extra_open_BEST_GOALKEEPER',
  'extra_pts_WORLD_CUP_WINNER',
  'extra_pts_TOP_SCORER',
  'extra_pts_BEST_GOALKEEPER',
]);

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null) as Record<string, string> | null;
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const entries = Object.entries(body).filter(([key, value]) =>
    ALLOWED_SETTINGS.has(key) && typeof value === 'string' && value.length <= 200
  );
  if (entries.length === 0) return NextResponse.json({ error: 'No valid keys' }, { status: 400 });

  await Promise.all(
    entries.map(([key, value]) =>
      db.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );
  return NextResponse.json({ ok: true });
}
