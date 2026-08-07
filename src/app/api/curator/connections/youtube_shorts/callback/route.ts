import { NextRequest, NextResponse } from 'next/server';
import { completeConnection } from '@/lib/socialAuth/completeConnection';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  try {
    const platform = await completeConnection(url.searchParams, 'YOUTUBE_SHORTS');
    return NextResponse.redirect(new URL(`/curator/dashboard/listings?connected=${platform}`, req.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed.';
    return NextResponse.redirect(
      new URL(`/curator/dashboard/listings?connection_error=${encodeURIComponent(message)}`, req.url)
    );
  }
}
