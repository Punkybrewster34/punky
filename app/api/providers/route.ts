import { NextRequest, NextResponse } from 'next/server';
import { searchProviders, seedIfEmpty } from '@/lib/marketplace/db';

export async function GET(req: NextRequest) {
  seedIfEmpty();
  const sp = req.nextUrl.searchParams;
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);

  const providers = searchProviders({
    lat: num('lat') ?? null,
    lng: num('lng') ?? null,
    service: sp.get('service') || undefined,
    maxPrice: num('maxPrice'),
    minRating: num('minRating'),
    verifiedOnly: sp.get('verifiedOnly') === 'true' || undefined,
    sort: (sp.get('sort') as 'distance' | 'rating' | 'price') || undefined,
    query: sp.get('query') || undefined,
  });

  return NextResponse.json({ providers });
}
