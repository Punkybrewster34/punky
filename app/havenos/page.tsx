import { isHavenosAuthenticated } from '@/lib/havenos-auth';
import bundle from '@/havenos-site/dashboards.json';
import HavenosLogin from './HavenosLogin';
import HavenosViewer from './HavenosViewer';

export const metadata = { title: 'HavenOS · Haven House Cleaning' };

export default function HavenosPage() {
  if (!isHavenosAuthenticated()) {
    return <HavenosLogin />;
  }
  const names = Object.keys(bundle.dashboards ?? {});
  return <HavenosViewer names={names} generatedAt={bundle.generated_at ?? ''} />;
}
