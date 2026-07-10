import { NextResponse } from 'next/server';
import { getCurrentUser, publicUser } from '@/lib/marketplace/session';
import { getProfile } from '@/lib/marketplace/db';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const profile = user.role === 'provider' ? getProfile(user.id) : null;
  return NextResponse.json({ user: publicUser(user), profile });
}
