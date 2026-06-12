export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkRateLimit(`change-pw:${session.user.id}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera 15 minutos.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Mínimo 8 caracteres' }, { status: 400 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.user.update({
    where: { id: session.user.id },
    data:  { passwordHash, mustChangePassword: false },
  });

  return NextResponse.json({ ok: true });
}
