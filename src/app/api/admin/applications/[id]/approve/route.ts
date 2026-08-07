import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';
import { generateMagicLinkToken } from '@/lib/magicLink';
import { sendCuratorApplicationApproved } from '@/lib/resend';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const application = await prisma.curatorApplication.findUnique({ where: { id: params.id } });
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  if (application.status !== 'PENDING') {
    return NextResponse.json({ error: 'Application already reviewed' }, { status: 409 });
  }

  const signupToken = generateMagicLinkToken();

  await prisma.curatorApplication.update({
    where: { id: application.id },
    data: { status: 'APPROVED', signupToken, reviewedAt: new Date() },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const signupUrl = `${base}/curator/signup/${signupToken}`;
  await sendCuratorApplicationApproved(application.email, signupUrl);

  return NextResponse.json({ ok: true });
}
