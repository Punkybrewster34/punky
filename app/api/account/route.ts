import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, publicUser } from '@/lib/marketplace/session';
import { updateUser } from '@/lib/marketplace/db';

// Update the signed-in user's own basic info / saved location.
export async function PATCH(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (typeof body.phone === 'string') patch.phone = body.phone.trim();
  if (typeof body.avatarUrl === 'string') patch.avatarUrl = body.avatarUrl;
  if (typeof body.address === 'string') patch.address = body.address.trim();
  if (typeof body.lat === 'number') patch.lat = body.lat;
  if (typeof body.lng === 'number') patch.lng = body.lng;

  const updated = updateUser(user.id, patch);
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 400 });
  return NextResponse.json({ user: publicUser(updated) });
}
