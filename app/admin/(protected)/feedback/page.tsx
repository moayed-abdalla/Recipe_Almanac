import { getAllFeedback } from '@/lib/admin-metrics';
import AdminFeedbackClient from '@/components/admin/AdminFeedbackClient';

export default async function AdminFeedbackPage() {
  const items = await getAllFeedback();
  return <AdminFeedbackClient items={items} />;
}
