import { getAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/AdminNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AdminApplicationActions } from '@/components/AdminApplicationActions';
import { platformLabel, genreLabel } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AdminApplicationsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  // oauthPending: false excludes gated-platform applications still mid-OAuth-verification (or
  // abandoned partway through) — see start-verification/route.ts and completeConnection.ts.
  // followerCount/profileUrl are guaranteed non-null once that's false.
  const applications = await prisma.curatorApplication.findMany({
    where: { status: 'PENDING', oauthPending: false },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <AdminNav />
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Curator applications</h1>

      {applications.length === 0 ? (
        <p className="text-muted">No pending applications.</p>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <div className="mb-3 flex items-center gap-2">
                <Badge>{platformLabel(app.platform)}</Badge>
                <Badge tone="neutral">{genreLabel(app.genre)}</Badge>
                <span className="text-sm text-muted">
                  {(app.followerCount ?? 0).toLocaleString('en-US')} followers
                </span>
                {app.verifiedExternalUserId && <Badge tone="success">Verified via OAuth</Badge>}
              </div>
              <div className="mb-1 font-medium text-ink">
                @{app.proposedUsername} · {app.email}
              </div>
              {app.profileUrl && (
                <a href={app.profileUrl} target="_blank" rel="noreferrer" className="mb-3 block text-sm text-ink underline">
                  {app.profileUrl}
                </a>
              )}
              <p className="mb-4 whitespace-pre-wrap text-sm text-muted">{app.message}</p>
              <AdminApplicationActions applicationId={app.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
