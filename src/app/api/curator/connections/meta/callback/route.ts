import { NextRequest, NextResponse } from 'next/server';
import { completeConnection } from '@/lib/socialAuth/completeConnection';

// One Meta app's redirect URI serves both Instagram and Facebook Reels — which one is being
// verified comes from the signed `state` param set when the connect flow started, not from
// this route's path. completeConnection() also handles both the curator-dashboard and the
// pre-account application flow, and always resolves to a redirect path rather than throwing.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const redirectPath = await completeConnection(url.searchParams);
  return NextResponse.redirect(new URL(redirectPath, req.url));
}
