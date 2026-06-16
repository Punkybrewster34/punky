import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/marketplace/session';
import { getJob, transitionJob } from '@/lib/marketplace/db';
import { JobStatus } from '@/lib/marketplace/types';

// Provider acts on one of their jobs: accept / decline / start / complete.
const ACTION_TO_STATUS: Record<string, JobStatus> = {
  accept: 'accepted',
  decline: 'declined',
  start: 'in_progress',
  complete: 'completed',
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user || user.role !== 'provider') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  const job = getJob(params.id);
  if (!job || job.providerId !== user.id) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as { action?: string; reason?: string };
  const target = ACTION_TO_STATUS[body.action ?? ''];
  if (!target) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  const updated = transitionJob(job.id, target, { declineReason: body.reason });
  if (!updated) {
    return NextResponse.json(
      { error: `Cannot ${body.action} a job that is ${job.status}` },
      { status: 409 }
    );
  }
  return NextResponse.json({ job: updated });
}
