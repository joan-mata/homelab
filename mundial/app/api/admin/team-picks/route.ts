import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const createSchema = z.object({
  name:    z.string().min(1).max(100),
  pts:     z.number().int().min(1).max(1000),
  teamIds: z.array(z.string().min(1).max(10)).min(1).max(48),
});

const patchSchema = z.object({
  id:       z.string().min(1),
  action:   z.enum(['resolve', 'toggle']),
  winnerId: z.string().min(1).max(10).optional(),
  open:     z.boolean().optional(),
});

const putSchema = z.object({
  order: z.array(z.string().min(1).max(50)).max(100),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contests = await db.teamPickContest.findMany({
    include: { entries: { include: { user: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(contests);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  const { name, pts, teamIds } = parsed.data;

  const contest = await db.teamPickContest.create({ data: { name, pts, teamIds } });
  return NextResponse.json(contest, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  const { id, action, winnerId, open } = parsed.data;

  if (action === 'resolve') {
    if (!winnerId) return NextResponse.json({ error: 'Missing winnerId' }, { status: 400 });
    const contest = await db.teamPickContest.findUnique({ where: { id }, include: { entries: true } });
    if (!contest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.$transaction([
      ...contest.entries.map(e =>
        db.teamPickEntry.update({
          where: { id: e.id },
          data: { points: e.teamIds.includes(winnerId) ? contest.pts : 0 },
        })
      ),
      db.teamPickContest.update({ where: { id }, data: { resolved: true, open: false, winnerId } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === 'toggle') {
    await db.teamPickContest.update({ where: { id }, data: { open: open ?? false } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function PUT(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  const { order } = parsed.data;

  await db.setting.upsert({
    where:  { key: 'contest_order' },
    create: { key: 'contest_order', value: JSON.stringify(order) },
    update: { value: JSON.stringify(order) },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await db.teamPickContest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
