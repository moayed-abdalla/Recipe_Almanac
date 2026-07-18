import { getAdminMetrics } from '@/lib/admin-metrics';
import AdminOverviewClient from '@/components/admin/AdminOverviewClient';

type OverviewPageProps = {
  searchParams: {
    range?: string;
  };
};

export default async function AdminOverviewPage({ searchParams }: OverviewPageProps) {
  const metrics = await getAdminMetrics(searchParams.range);

  return <AdminOverviewClient metrics={metrics} />;
}
