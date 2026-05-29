import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { readData, addCleaner } from '@/lib/data';

export async function GET() {
  if (!isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { cleaners } = readData();
  return NextResponse.json({ cleaners });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, notes } = (await req.json()) as { name: string; notes?: string };
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const cleaner = addCleaner(name, notes);
  return NextResponse.json({ cleaner }, { status: 201 });
}
