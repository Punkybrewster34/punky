import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { allProvidersForAdmin, seedIfEmpty } from '@/lib/marketplace/db';

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  seedIfEmpty();
  return NextResponse.json({ providers: allProvidersForAdmin() });
}
