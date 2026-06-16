import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/marketplace/session';
import { getJob, transitionJob } from '@/lib/marketplace/db';

// Customer cancels their own booking (only while it is still cancellable).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user || user.role !== 'customer') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  const job = getJob(params.id);
  if (!job || job.customerId !== user.id) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== 'cancel') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
  const updated = transitionJob(job.id, 'cancelled');
  if (!updated) {
    return NextResponse.json({ error: `Cannot cancel a job that is ${job.status}` }, { status: 409 });
  }
  return NextResponse.json({ job: updated });
}
