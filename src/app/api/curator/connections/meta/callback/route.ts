import { NextRequest, NextResponse } from 'next/server';
import { completeConnection } from '@/lib/socialAuth/completeConnection';

// One Meta app's redirect URI serves both Instagram and Facebook Reels — which one is being
// verified comes from the signed `state` param set when the connect flow started, not from
// this route's path.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  try {
    const platform = await completeConnection(url.searchParams);
    return NextResponse.redirect(new URL(`/curator/dashboard/listings?connected=${platform}`, req.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed.';
    return NextResponse.redirect(
      new URL(`/curator/dashboard/listings?connection_error=${encodeURIComponent(message)}`, req.url)
    );
  }
}
