import { NextRequest, NextResponse } from 'next/server';
import { completeConnection } from '@/lib/socialAuth/completeConnection';

// Instagram's own OAuth domain (instagram.com, not facebook.com) redirects here directly — see
// src/lib/socialAuth/instagram.ts for why this is a separate callback from Facebook Reels'.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const redirectPath = await completeConnection(url.searchParams, 'INSTAGRAM');
  return NextResponse.redirect(new URL(redirectPath, req.url));
}
