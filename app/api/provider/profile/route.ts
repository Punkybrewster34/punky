import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/marketplace/session';
import { getProfile, updateProfile } from '@/lib/marketplace/db';

export async function GET() {
  const user = getCurrentUser();
  if (!user || user.role !== 'provider') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  return NextResponse.json({ profile: getProfile(user.id) });
}

export async function PATCH(req: NextRequest) {
  const user = getCurrentUser();
  if (!user || user.role !== 'provider') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Whitelist editable profile fields.
  const patch: Record<string, unknown> = {};
  const strFields = ['headline', 'bio', 'city', 'state', 'zip'];
  const numFields = ['hourlyRate', 'yearsExperience', 'teamSize', 'serviceRadiusMiles', 'lat', 'lng'];
  const boolFields = ['isTeam', 'acceptingJobs', 'insured', 'suppliesIncluded'];

  for (const f of strFields) if (typeof body[f] === 'string') patch[f] = (body[f] as string);
  for (const f of numFields) if (typeof body[f] === 'number') patch[f] = body[f];
  for (const f of boolFields) if (typeof body[f] === 'boolean') patch[f] = body[f];
  if (Array.isArray(body.services)) patch.services = (body.services as unknown[]).filter((s) => typeof s === 'string');
  if (Array.isArray(body.photos)) patch.photos = (body.photos as unknown[]).filter((s) => typeof s === 'string');

  const updated = updateProfile(user.id, patch);
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 400 });
  return NextResponse.json({ profile: updated });
}
