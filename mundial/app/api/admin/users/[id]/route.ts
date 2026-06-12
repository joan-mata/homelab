export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  name:           z.string().min(1).max(100).optional(),
  telegramChatId: z.string().nullable().optional(),
  telegramToken:  z.string().nullable().optional(),
  active:         z.boolean().optional(),
  resetFavorite:  z.boolean().optional(),
  newPassword:    z.string().min(8).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined)           data.name = parsed.data.name;
  if (parsed.data.telegramChatId !== undefined) data.telegramChatId = parsed.data.telegramChatId;
  if (parsed.data.telegramToken  !== undefined) data.telegramToken  = parsed.data.telegramToken;
  if (parsed.data.active !== undefined)         data.active = parsed.data.active;
  if (parsed.data.resetFavorite)                data.favoriteTeam = null;
  if (parsed.data.newPassword) {
    data.passwordHash      = await bcrypt.hash(parsed.data.newPassword, 12);
    data.mustChangePassword = true;
  }

  await db.user.update({ where: { id }, data });

  if (parsed.data.active === false) {
    await writeAudit(session.user.id, 'USER_DEACTIVATED', { userId: id });
  }
  if (parsed.data.resetFavorite) {
    await writeAudit(session.user.id, 'FAVORITE_RESET', { userId: id });
  }
  if (parsed.data.newPassword) {
    await writeAudit(session.user.id, 'PASSWORD_RESET', { userId: id });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
  }
  await writeAudit(session.user.id, 'USER_DELETED', { userId: id });
  await db.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
