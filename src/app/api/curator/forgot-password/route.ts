import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validations';
import { generatePasswordResetToken, passwordResetUrl, PASSWORD_RESET_TOKEN_TTL_MS } from '@/lib/passwordReset';
import { sendCuratorPasswordResetEmail } from '@/lib/resend';

// Always responds 200 with the same generic message regardless of whether the email matches a
// curator — otherwise this endpoint could be used to enumerate registered curator emails.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const curator = await prisma.curator.findUnique({ where: { email: parsed.data.email } });
  if (curator) {
    const token = generatePasswordResetToken();
    await prisma.curator.update({
      where: { id: curator.id },
      data: {
        passwordResetToken: token,
        passwordResetTokenExpiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      },
    });
    await sendCuratorPasswordResetEmail(curator.email, passwordResetUrl(token));
  }

  return NextResponse.json({ ok: true });
}
