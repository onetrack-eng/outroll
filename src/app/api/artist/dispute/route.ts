import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { disputeSchema } from '@/lib/validations';
import { isPast } from '@/lib/businessDays';
import { sendCuratorDisputeFiledEmail } from '@/lib/resend';

// Artist files a dispute from their magic-link dashboard (spec section 2 & 3). This freezes
// only the one Hold in question — every other hold in the campaign (or the curator's other
// in-flight work) is untouched, since the freeze is just this hold's status flipping to DISPUTED.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = body?.token as string | undefined;
  const holdId = body?.holdId as string | undefined;
  const parsed = disputeSchema.safeParse(body);

  if (!token || !holdId || !parsed.success) {
    return NextResponse.json(
      { error: parsed.success ? 'Missing session' : parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.findUnique({ where: { magicLinkToken: token } });
  if (!campaign) return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });

  const hold = await prisma.hold.findUnique({
    where: { id: holdId },
    include: { curator: true },
  });
  if (!hold || hold.campaignId !== campaign.id) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }
  if (hold.status !== 'POSTED') {
    return NextResponse.json({ error: 'This hold is not eligible for a dispute right now.' }, { status: 409 });
  }
  if (hold.payoutReleaseAt && isPast(hold.payoutReleaseAt)) {
    return NextResponse.json(
      { error: 'The one-week dispute window for this post has closed.' },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.dispute.create({ data: { holdId: hold.id, reason: parsed.data.reason } }),
    prisma.hold.update({ where: { id: hold.id }, data: { status: 'DISPUTED' } }),
  ]);

  await sendCuratorDisputeFiledEmail(
    hold.curator.email,
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/curator/dashboard/submissions/${hold.id}`
  ).catch((err) => console.error('Failed to send dispute-filed email', err));

  return NextResponse.json({ ok: true });
}
