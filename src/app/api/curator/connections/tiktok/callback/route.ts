import { NextRequest, NextResponse } from 'next/server';
import { completeConnection } from '@/lib/socialAuth/completeConnection';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const redirectPath = await completeConnection(url.searchParams, 'TIKTOK');
  return NextResponse.redirect(new URL(redirectPath, req.url));
}
