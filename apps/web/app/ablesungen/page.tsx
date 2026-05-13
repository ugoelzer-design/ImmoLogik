import { AdminShell } from "@/components/layout/admin-shell";
import { ReadingCampaignsModule } from "@/features/meter-readings/components/reading-campaigns-module";
import { getReadingCampaigns } from "@/features/meter-readings/services/meter-readings.service";
import { getObjects } from "@/features/objects/services/objects.service";

export default async function AblesungenPage() {
  const [objects, campaigns] = await Promise.all([
    getObjects().catch(() => []),
    getReadingCampaigns().catch(() => []),
  ]);

  return (
    <AdminShell>
      <ReadingCampaignsModule objects={objects} initialCampaigns={campaigns} />
    </AdminShell>
  );
}
