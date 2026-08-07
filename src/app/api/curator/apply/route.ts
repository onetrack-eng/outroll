import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { curatorApplicationSchema } from '@/lib/validations';

// Public curator application (spec section 2: "Apply via a public form; approval is manual
// and fully subjective"). This just records the application — an admin reviews it later.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = curatorApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid application' }, { status: 400 });
  }

  await prisma.curatorApplication.create({ data: parsed.data });
  return NextResponse.json({ ok: true });
}
