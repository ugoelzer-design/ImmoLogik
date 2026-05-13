import { AdminShell } from "@/components/layout/admin-shell";
import { ContractsModule } from "@/features/contracts/components/contracts-module";
import { getDocuments } from "@/features/documents/services/documents.service";
import { getObjects } from "@/features/objects/services/objects.service";
import { getContracts } from "@/features/contracts/services/contracts.service";
import { getTenants } from "@/features/tenants/services/tenants.service";

export default async function VertraegePage() {
  const [contracts, objects, tenants, documents] = await Promise.all([
    getContracts().catch(() => []),
    getObjects().catch(() => []),
    getTenants().catch(() => []),
    getDocuments().catch(() => []),
  ]);

  return (
    <AdminShell>
      <ContractsModule contracts={contracts} objects={objects} tenants={tenants} documents={documents} />
    </AdminShell>
  );
}
