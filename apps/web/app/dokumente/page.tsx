import { AdminShell } from "@/components/layout/admin-shell";
import { DocumentsModule } from "@/features/documents/components/documents-module";
import { getDocuments } from "@/features/documents/services/documents.service";

async function getObjects() {
  try {
    const res = await fetch("http://localhost:3000/objects", { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function DokumentePage() {
  const [documents, objects] = await Promise.all([getDocuments(), getObjects()]);
  return (
    <AdminShell>
      <DocumentsModule initialDocuments={documents} objects={objects} />
    </AdminShell>
  );
}