import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, setCuratorSession } from '@/lib/auth';
import { resetPasswordSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const curator = await prisma.curator.findUnique({ where: { passwordResetToken: parsed.data.token } });
  if (
    !curator ||
    !curator.passwordResetTokenExpiresAt ||
    curator.passwordResetTokenExpiresAt < new Date()
  ) {
    return NextResponse.json(
      { error: 'This reset link is invalid or has expired. Request a new one.' },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  // Clearing the token here is what makes this single-use — a second attempt with the same
  // (possibly leaked/logged) link will fail the lookup above instead of resetting the password
  // again.
  await prisma.curator.update({
    where: { id: curator.id },
    data: { passwordHash, passwordResetToken: null, passwordResetTokenExpiresAt: null },
  });

  await setCuratorSession(curator.id);
  return NextResponse.json({ ok: true });
}
