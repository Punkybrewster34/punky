import { NextResponse } from 'next/server';
import { getPublicProvider, reviewsForProvider, seedIfEmpty } from '@/lib/marketplace/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  seedIfEmpty();
  const provider = getPublicProvider(params.id);
  if (!provider || !provider.isVerified) {
    return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
  }
  const reviews = reviewsForProvider(params.id);
  return NextResponse.json({ provider, reviews });
}
