import { AdminShell } from "@/components/layout/admin-shell";
import { getDocuments } from "@/features/documents/services/documents.service";
import { ObjectsModule } from "@/features/objects/components/objects-module";
import { getObjects } from "@/features/objects/services/objects.service";

export default async function ObjektePage() {
  const [objects, documents] = await Promise.all([
    getObjects().catch(() => []),
    getDocuments().catch(() => []),
  ]);

  return (
    <AdminShell>
      <ObjectsModule initialObjects={objects} documents={documents} />
    </AdminShell>
  );
}
