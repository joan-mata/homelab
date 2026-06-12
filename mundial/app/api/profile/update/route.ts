export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendWelcomeMessage } from '@/lib/telegram';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  name:           z.string().min(1).max(100).optional(),
  telegramChatId: z.string().nullable().optional(),
  telegramToken:  z.string().nullable().optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name           !== undefined) data.name           = parsed.data.name;
  if (parsed.data.telegramChatId !== undefined) data.telegramChatId = parsed.data.telegramChatId;
  if (parsed.data.telegramToken  !== undefined) data.telegramToken  = parsed.data.telegramToken;

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });

  const before = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, telegramChatId: true },
  });

  await db.user.update({ where: { id: session.user.id }, data });

  const connectingTelegram =
    !before?.telegramChatId &&
    parsed.data.telegramChatId &&
    parsed.data.telegramToken;

  if (connectingTelegram) {
    await sendWelcomeMessage(
      parsed.data.telegramChatId!,
      parsed.data.telegramToken!,
      before?.name ?? session.user.name ?? 'jugador'
    ).catch(e => console.error('[profile/update] telegram welcome:', e));
  }

  return NextResponse.json({ ok: true });
}
