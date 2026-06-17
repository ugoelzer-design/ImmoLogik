import { AdminShell } from "@/components/layout/admin-shell";
import { getContracts } from "@/features/contracts/services/contracts.service";
import { getDocuments } from "@/features/documents/services/documents.service";
import { getRentUnits } from "@/features/finances/services/rent-units.service";
import { getUtilityStatementsWorkspace } from "@/features/finances/services/utility-statements.service";
import { getMeters, getReadingCampaigns } from "@/features/meter-readings/services/meter-readings.service";
import { ObjectsModule } from "@/features/objects/components/objects-module";
import { getObjects } from "@/features/objects/services/objects.service";
import { getTenants } from "@/features/tenants/services/tenants.service";

export default async function ObjektePage() {
  const [
    objects,
    documents,
    tenants,
    contracts,
    rentUnits,
    meters,
    utilityWorkspace,
    readingCampaigns,
  ] = await Promise.all([
    getObjects().catch(() => []),
    getDocuments().catch(() => []),
    getTenants().catch(() => []),
    getContracts().catch(() => []),
    getRentUnits().catch(() => []),
    getMeters().catch(() => []),
    getUtilityStatementsWorkspace().catch(() => ({ settlements: [] })),
    getReadingCampaigns().catch(() => []),
  ]);

  return (
    <AdminShell>
      <ObjectsModule
        initialObjects={objects}
        documents={documents}
        tenants={tenants}
        contracts={contracts}
        rentUnits={rentUnits}
        meters={meters}
        utilityStatements={utilityWorkspace.settlements}
        readingCampaigns={readingCampaigns}
      />
    </AdminShell>
  );
}
