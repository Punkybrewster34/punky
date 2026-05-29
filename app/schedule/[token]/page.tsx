import { notFound } from 'next/navigation';
import { getCleanerByToken, getScheduleForCleaner, readData } from '@/lib/data';
import { getScheduleWeeks } from '@/lib/dates';
import ScheduleClient from './ScheduleClient';

export const dynamic = 'force-dynamic';

export default function SchedulePage({ params }: { params: { token: string } }) {
  const cleaner = getCleanerByToken(params.token);
  if (!cleaner) return notFound();

  const schedule = getScheduleForCleaner(params.token);
  const data = readData();
  const weeks = getScheduleWeeks(data.settings.showWeekends);

  return (
    <ScheduleClient
      token={params.token}
      cleaner={cleaner}
      initialSchedule={schedule}
      weeks={weeks}
      settings={data.settings}
    />
  );
}
