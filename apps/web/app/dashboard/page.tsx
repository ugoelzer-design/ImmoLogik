import { AdminShell } from "@/components/layout/admin-shell";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";
import { getObjects } from "@/features/objects/services/objects.service";

export default async function DashboardPage() {
  const objects = await getObjects();

  return (
    <AdminShell>
      <DashboardOverview objectCount={objects.length} />
    </AdminShell>
  );
}
