import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';
import { sendCuratorApplicationDeclined } from '@/lib/resend';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const application = await prisma.curatorApplication.findUnique({ where: { id: params.id } });
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  if (application.status !== 'PENDING') {
    return NextResponse.json({ error: 'Application already reviewed' }, { status: 409 });
  }

  await prisma.curatorApplication.update({
    where: { id: application.id },
    data: { status: 'DECLINED', reviewedAt: new Date() },
  });

  await sendCuratorApplicationDeclined(application.email);

  return NextResponse.json({ ok: true });
}
