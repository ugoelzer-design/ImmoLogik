import { AdminShell } from "@/components/layout/admin-shell";
import { ObjectsModule } from "@/features/objects/components/objects-module";
import { getObjects } from "@/features/objects/services/objects.service";

export default async function ObjektePage() {
  const objects = await getObjects();

  return (
    <AdminShell>
      <ObjectsModule initialObjects={objects} />
    </AdminShell>
  );
}
