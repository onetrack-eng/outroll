import { NextRequest, NextResponse } from 'next/server';
import { getCuratorSession } from '@/lib/auth';
import { platformForStartRoute, getAuthUrl } from '@/lib/socialAuth';
import { createConnectState } from '@/lib/socialAuth/state';
import { generateCodeVerifier } from '@/lib/socialAuth/pkce';

// Kicks off the OAuth round trip for one of the gated platforms (see GATED_PLATFORMS in
// @/lib/constants). `params.platform` is a route-friendly segment (e.g. "youtube_shorts"), not
// the Prisma enum value directly.
export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  const session = await getCuratorSession();
  if (!session) {
    return NextResponse.redirect(new URL('/curator/login?next=/curator/dashboard/listings', req.url));
  }

  const platform = platformForStartRoute(params.platform);
  if (!platform) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 404 });
  }

  const codeVerifier = generateCodeVerifier();
  const state = await createConnectState({ kind: 'curator', curatorId: session.sub, platform, codeVerifier });
  return NextResponse.redirect(getAuthUrl(platform, state, codeVerifier));
}
