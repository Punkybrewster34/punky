import { isAdminAuthenticated } from '@/lib/auth';
import { readData } from '@/lib/data';
import { getScheduleWeeks } from '@/lib/dates';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  if (!isAdminAuthenticated()) {
    return <AdminLogin />;
  }

  const data = readData();
  const weeks = getScheduleWeeks(data.settings.showWeekends);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  return <AdminDashboard initialData={data} weeks={weeks} siteUrl={siteUrl} />;
}
