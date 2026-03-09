import { AdminShell } from "@/components/layout/admin-shell";
import { DocumentsModule } from "@/features/documents/components/documents-module";
import { getDocuments } from "@/features/documents/services/documents.service";

export default async function DokumentePage() {
  const documents = await getDocuments();

  return (
    <AdminShell>
      <DocumentsModule documents={documents} />
    </AdminShell>
  );
}
