import { NextRequest, NextResponse } from 'next/server';
import {
  getCleanerByToken,
  getScheduleForCleaner,
  updateSchedule,
  readData,
  type Availability,
} from '@/lib/data';

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const cleaner = getCleanerByToken(params.token);
  if (!cleaner) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const schedule = getScheduleForCleaner(params.token);
  const { settings } = readData();
  return NextResponse.json({ cleaner: { name: cleaner.name }, schedule, settings });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const cleaner = getCleanerByToken(params.token);
  if (!cleaner) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = (await req.json()) as {
    dateStr?: string;
    availability?: Availability;
    comments?: string;
  };

  if (body.dateStr !== undefined) {
    const current = getScheduleForCleaner(params.token);
    const updated = { ...current.availability };
    if (body.availability === null || body.availability === undefined) {
      delete updated[body.dateStr];
    } else {
      updated[body.dateStr] = body.availability;
    }
    updateSchedule(params.token, { availability: updated });
  } else if (body.comments !== undefined) {
    updateSchedule(params.token, { comments: body.comments });
  }

  return NextResponse.json({ ok: true });
}
