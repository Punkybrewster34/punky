import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { decideBackgroundCheck } from '@/lib/marketplace/db';

// Admin approves or rejects a provider's background check, which flips
// their verified status and discoverability.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { decision?: string; note?: string };
  if (body.decision !== 'approve' && body.decision !== 'reject') {
    return NextResponse.json({ error: 'decision must be approve or reject' }, { status: 400 });
  }
  const updated = decideBackgroundCheck(params.id, body.decision === 'approve', body.note);
  if (!updated) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  return NextResponse.json({ profile: updated });
}
