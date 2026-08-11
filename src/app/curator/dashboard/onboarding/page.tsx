import { getCuratorSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StartOnboardingButton } from '@/components/StartOnboardingButton';

export const dynamic = 'force-dynamic';

export default async function CuratorOnboardingPage() {
  const session = await getCuratorSession();
  if (!session) redirect('/curator/login');

  const curator = await prisma.curator.findUnique({ where: { id: session.sub } });
  if (!curator) redirect('/curator/login');

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Payout setup</h1>
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted">Status:</span>
          {curator.stripeOnboardingComplete ? (
            <Badge tone="success">Connected</Badge>
          ) : (
            <Badge tone="warning">Not connected</Badge>
          )}
        </div>
        <p className="mb-6 text-sm text-muted">
          Outroll uses Stripe Connect to pay you out. You&rsquo;ll link a bank account on
          Stripe&rsquo;s secure onboarding flow — we never see your bank details directly.
        </p>
        <StartOnboardingButton
          label={curator.stripeAccountId ? 'Continue onboarding' : 'Connect with Stripe'}
        />
      </Card>
    </div>
  );
}
