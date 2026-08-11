import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, setCuratorSession } from '@/lib/auth';
import { curatorLoginSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = curatorLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
  }

  const curator = await prisma.curator.findUnique({ where: { email: parsed.data.email } });
  if (!curator || !(await verifyPassword(parsed.data.password, curator.passwordHash))) {
    return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
  }

  await setCuratorSession(curator.id);
  return NextResponse.json({ ok: true });
}
