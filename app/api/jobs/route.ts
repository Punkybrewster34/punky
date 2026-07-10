import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/marketplace/session';
import {
  createJob,
  jobsForCustomer,
  getProfile,
  getPublicProvider,
  reviewForJob,
} from '@/lib/marketplace/db';
import { estimateJob } from '@/lib/marketplace/pricing';

// List the signed-in customer's bookings, enriched with provider summary
// and whether each completed job has been reviewed yet.
export async function GET() {
  const user = getCurrentUser();
  if (!user || user.role !== 'customer') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  const jobs = jobsForCustomer(user.id).map((j) => {
    const provider = getPublicProvider(j.providerId);
    return {
      ...j,
      providerName: provider?.name ?? 'Cleaner',
      providerAvatar: provider?.avatarUrl ?? '',
      reviewed: !!reviewForJob(j.id),
    };
  });
  return NextResponse.json({ jobs });
}

// Create a booking request to a specific provider. Price is recomputed
// server-side from the provider's real rate so it cannot be tampered with.
export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user || user.role !== 'customer') {
    return NextResponse.json({ error: 'Please sign in as a customer to book' }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const providerId = String(body.providerId ?? '');
  const provider = getPublicProvider(providerId);
  const profile = getProfile(providerId);
  if (!provider || !profile || !provider.isVerified) {
    return NextResponse.json({ error: 'Cleaner is not available' }, { status: 404 });
  }
  if (!provider.acceptingJobs) {
    return NextResponse.json({ error: 'This cleaner is not accepting jobs right now' }, { status: 409 });
  }
  if (!body.address) {
    return NextResponse.json({ error: 'A service address is required' }, { status: 400 });
  }
  if (!body.scheduledDate) {
    return NextResponse.json({ error: 'Please pick a date' }, { status: 400 });
  }

  const serviceType = String(body.serviceType ?? 'standard');
  const bedrooms = Number(body.bedrooms ?? 0);
  const bathrooms = Number(body.bathrooms ?? 0);
  const squareFeet = Number(body.squareFeet ?? 0);
  const addOns = Array.isArray(body.addOns) ? (body.addOns as string[]) : [];
  const tasks = Array.isArray(body.tasks) ? (body.tasks as string[]) : [];

  const estimate = estimateJob({
    hourlyRate: profile.hourlyRate,
    serviceType,
    bedrooms,
    bathrooms,
    squareFeet,
    addOns,
  });

  const job = createJob({
    customerId: user.id,
    providerId,
    address: String(body.address),
    lat: typeof body.lat === 'number' ? body.lat : null,
    lng: typeof body.lng === 'number' ? body.lng : null,
    propertyType: String(body.propertyType ?? 'house'),
    bedrooms,
    bathrooms,
    squareFeet,
    serviceType,
    tasks,
    addOns,
    notes: String(body.notes ?? ''),
    scheduledDate: String(body.scheduledDate),
    scheduledWindow: String(body.scheduledWindow ?? 'morning'),
    recurring: String(body.recurring ?? 'none'),
    estimatedHours: estimate.hours,
    estimatedPrice: estimate.total,
  });

  return NextResponse.json({ job }, { status: 201 });
}
