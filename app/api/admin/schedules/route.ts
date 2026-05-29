import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { readData } from '@/lib/data';

export async function GET() {
  if (!isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = readData();
  return NextResponse.json({ cleaners: data.cleaners, schedules: data.schedules, settings: data.settings });
}
