import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { applicationDraftSchema } from '@/lib/validations';
import { getAuthUrl } from '@/lib/socialAuth';
import { createConnectState } from '@/lib/socialAuth/state';
import { generateCodeVerifier } from '@/lib/socialAuth/pkce';

// Every curator application requires connecting Instagram via OAuth — no self-reported
// follower count, no platform choice. This creates a pending draft CuratorApplication and
// immediately routes into the same OAuth flow already built for curator dashboards (see
// src/lib/socialAuth/), just keyed by this draft's id instead of an authenticated curatorId
// (see ConnectState in state.ts). The draft stays invisible to admin (oauthPending: true) until
// the callback fills in the verified data — see completeConnection.ts and AdminApplicationsPage.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = applicationDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid application' }, { status: 400 });
  }

  const application = await prisma.curatorApplication.create({
    data: { ...parsed.data, platform: 'INSTAGRAM', followerCount: null, profileUrl: null, oauthPending: true },
  });

  const codeVerifier = generateCodeVerifier();
  const state = await createConnectState({
    kind: 'application',
    applicationId: application.id,
    platform: 'INSTAGRAM',
    codeVerifier,
  });

  return NextResponse.json({ redirectUrl: getAuthUrl('INSTAGRAM', state, codeVerifier) });
}
