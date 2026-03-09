import { AdminShell } from "@/components/layout/admin-shell";
import { TenantsModule } from "@/features/tenants/components/tenants-module";
import { getTenants } from "@/features/tenants/services/tenants.service";

export default async function MieterPage() {
  const tenants = await getTenants();

  return (
    <AdminShell>
      <TenantsModule tenants={tenants} />
    </AdminShell>
  );
}
