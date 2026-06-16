import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/marketplace/session';

export default function DashboardRedirect() {
  const user = getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');
  redirect(user.role === 'provider' ? '/dashboard/provider' : '/dashboard/customer');
}
