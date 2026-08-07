import { NextRequest, NextResponse } from 'next/server';
import { runDeadlineSweep } from '@/lib/deadlineSweep';

// Vercel Cron calls this on a schedule (see vercel.json) with an
// `Authorization: Bearer $CRON_SECRET` header automatically attached when CRON_SECRET is set
// as a project env var. Any other scheduler just needs to send the same header.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runDeadlineSweep();
  return NextResponse.json(result);
}
