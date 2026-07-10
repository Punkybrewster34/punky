import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/marketplace/session';
import { jobsForProvider, getUserById } from '@/lib/marketplace/db';

// Jobs assigned to the signed-in provider, enriched with customer contact
// info (revealed once a job is accepted).
export async function GET() {
  const user = getCurrentUser();
  if (!user || user.role !== 'provider') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  const jobs = jobsForProvider(user.id).map((j) => {
    const customer = getUserById(j.customerId);
    const revealContact = j.status === 'accepted' || j.status === 'in_progress' || j.status === 'completed';
    return {
      ...j,
      customerName: customer?.name ?? 'Customer',
      customerPhone: revealContact ? customer?.phone ?? '' : '',
    };
  });
  return NextResponse.json({ jobs });
}
