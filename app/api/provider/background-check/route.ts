import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/marketplace/session';
import { getProfile, submitBackgroundCheck } from '@/lib/marketplace/db';

// Provider submits themselves for screening. Status becomes "pending"
// until an admin makes a decision in the admin console.
export async function POST() {
  const user = getCurrentUser();
  if (!user || user.role !== 'provider') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  const profile = getProfile(user.id);
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 400 });
  if (profile.backgroundCheck.status === 'pending') {
    return NextResponse.json({ error: 'A screening is already in progress' }, { status: 409 });
  }
  const updated = submitBackgroundCheck(user.id);
  return NextResponse.json({ profile: updated });
}
