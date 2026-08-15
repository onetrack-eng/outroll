import { NextResponse } from 'next/server';
import { clearCuratorSession } from '@/lib/auth';

export async function POST() {
  await clearCuratorSession();
  return NextResponse.json({ ok: true });
}
