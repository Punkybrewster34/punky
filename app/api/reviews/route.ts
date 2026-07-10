import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/marketplace/session';
import { createReview, getJob } from '@/lib/marketplace/db';

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user || user.role !== 'customer') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const jobId = String(body.jobId ?? '');
  const rating = Number(body.rating ?? 0);
  const comment = String(body.comment ?? '');

  if (!jobId || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'A rating between 1 and 5 is required' }, { status: 400 });
  }
  const job = getJob(jobId);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const result = createReview({
    jobId,
    customerId: user.id,
    providerId: job.providerId,
    rating,
    comment,
  });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ review: result }, { status: 201 });
}
