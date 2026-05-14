import { AdminShell } from "@/components/layout/admin-shell";
import { getContracts } from "@/features/contracts/services/contracts.service";
import { getDocuments } from "@/features/documents/services/documents.service";
import { getRentUnits } from "@/features/finances/services/rent-units.service";
import { getObjects } from "@/features/objects/services/objects.service";
import { TenantsModule } from "@/features/tenants/components/tenants-module";
import { getTenants } from "@/features/tenants/services/tenants.service";

export default async function MieterPage() {
  const [tenants, objects, rentUnits, documents, contracts] = await Promise.all([
    getTenants().catch(() => []),
    getObjects().catch(() => []),
    getRentUnits().catch(() => []),
    getDocuments().catch(() => []),
    getContracts().catch(() => []),
  ]);

  return (
    <AdminShell>
      <TenantsModule
        tenants={tenants}
        objects={objects}
        rentUnits={rentUnits}
        documents={documents}
        contracts={contracts}
      />
    </AdminShell>
  );
}
