import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, setCuratorSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
  }

  const curator = await prisma.curator.findUnique({ where: { username: parsed.data.username } });
  if (!curator || !(await verifyPassword(parsed.data.password, curator.passwordHash))) {
    return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
  }

  await setCuratorSession(curator.id);
  return NextResponse.json({ ok: true });
}
