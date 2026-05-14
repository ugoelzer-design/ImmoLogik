import { AdminShell } from "@/components/layout/admin-shell";
import { getContracts } from "@/features/contracts/services/contracts.service";
import { getDocuments } from "@/features/documents/services/documents.service";
import { getRentUnits } from "@/features/finances/services/rent-units.service";
import { getReadingCampaigns } from "@/features/meter-readings/services/meter-readings.service";
import { ObjectsModule } from "@/features/objects/components/objects-module";
import { getObjects } from "@/features/objects/services/objects.service";
import { getTenants } from "@/features/tenants/services/tenants.service";

export default async function ObjektePage() {
  const [objects, documents, tenants, contracts, rentUnits, readingCampaigns] = await Promise.all([
    getObjects().catch(() => []),
    getDocuments().catch(() => []),
    getTenants().catch(() => []),
    getContracts().catch(() => []),
    getRentUnits().catch(() => []),
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
        readingCampaigns={readingCampaigns}
      />
    </AdminShell>
  );
}
