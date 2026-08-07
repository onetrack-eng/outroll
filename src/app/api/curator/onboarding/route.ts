import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCuratorSession } from '@/lib/auth';
import { createExpressAccount, createAccountOnboardingLink } from '@/lib/stripe';

// Kicks off (or resumes) Stripe Connect Express onboarding for the logged-in curator
// (spec section 2: "onboard via Stripe Connect (Express) to receive payouts").
export async function POST() {
  const session = await getCuratorSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const curator = await prisma.curator.findUnique({ where: { id: session.sub } });
  if (!curator) return NextResponse.json({ error: 'Curator not found' }, { status: 404 });

  let accountId = curator.stripeAccountId;
  if (!accountId) {
    const account = await createExpressAccount(curator.email);
    accountId = account.id;
    await prisma.curator.update({ where: { id: curator.id }, data: { stripeAccountId: accountId } });
  }

  const link = await createAccountOnboardingLink(accountId);
  return NextResponse.json({ url: link.url });
}
