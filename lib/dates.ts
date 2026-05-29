export interface ScheduleDay {
  date: Date;
  dateStr: string;
  displayDate: string;
  dayName: string;
  isWeekend: boolean;
}

export interface ScheduleWeek {
  label: string;
  days: ScheduleDay[];
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function displayDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dayName(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

function weekRange(days: ScheduleDay[]): string {
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const f = first.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const l = last.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${f} – ${l}`;
}

export function getScheduleWeeks(showWeekends = true): ScheduleWeek[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Always start on the next Monday
  const dow = today.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const toMonday = dow === 0 ? 1 : 8 - dow;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + toMonday);

  const allDays: ScheduleDay[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(nextMonday);
    d.setDate(nextMonday.getDate() + i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    if (!showWeekends && weekend) continue;
    allDays.push({
      date: d,
      dateStr: toDateStr(d),
      displayDate: displayDate(d),
      dayName: dayName(d),
      isWeekend: weekend,
    });
  }

  const week1: ScheduleDay[] = [];
  const week2: ScheduleDay[] = [];
  for (const day of allDays) {
    const diffMs = day.date.getTime() - nextMonday.getTime();
    const diffDays = diffMs / 86400000;
    if (diffDays < 7) week1.push(day);
    else week2.push(day);
  }

  return [
    { label: `Week 1: ${weekRange(week1)}`, days: week1 },
    { label: `Week 2: ${weekRange(week2)}`, days: week2 },
  ];
}
