import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { readData, updateSettings, type AppSettings } from '@/lib/data';

export async function GET() {
  if (!isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { settings } = readData();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  if (!isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const updates = (await req.json()) as Partial<AppSettings>;
  updateSettings(updates);
  return NextResponse.json({ ok: true });
}
