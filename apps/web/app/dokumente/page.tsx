import { AdminShell } from "@/components/layout/admin-shell";
import { DocumentsModule } from "@/features/documents/components/documents-module";
import { getRentUnits } from "@/features/finances/services/rent-units.service";
import { getDocuments } from "@/features/documents/services/documents.service";
import { getObjects } from "@/features/objects/services/objects.service";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DokumentePage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const initialFilters = {
    search: getSingleParam(resolvedSearchParams.search),
    category: getSingleParam(resolvedSearchParams.category),
    status: getSingleParam(resolvedSearchParams.status),
    fileState: getSingleParam(resolvedSearchParams.fileState),
    actionState: getSingleParam(resolvedSearchParams.actionState),
    reportYear: getSingleParam(resolvedSearchParams.reportYear),
    objectId: getSingleParam(resolvedSearchParams.objectId),
    rentUnitId: getSingleParam(resolvedSearchParams.rentUnitId),
  };

  const [documents, objects, rentUnits] = await Promise.all([
    getDocuments({
      ...(initialFilters.search ? { search: initialFilters.search } : {}),
      ...(initialFilters.category ? { category: initialFilters.category } : {}),
      ...(initialFilters.status ? { status: initialFilters.status } : {}),
      ...(initialFilters.fileState ? { fileState: initialFilters.fileState } : {}),
      ...(initialFilters.actionState ? { actionState: initialFilters.actionState } : {}),
      ...(initialFilters.reportYear ? { reportYear: initialFilters.reportYear } : {}),
      ...(initialFilters.objectId ? { objectId: initialFilters.objectId } : {}),
      ...(initialFilters.rentUnitId ? { rentUnitId: initialFilters.rentUnitId } : {}),
    }).catch(() => []),
    getObjects().catch(() => []),
    getRentUnits().catch(() => []),
  ]);

  return (
    <AdminShell>
      <DocumentsModule
        initialDocuments={documents}
        objects={objects}
        rentUnits={rentUnits}
        initialFilters={initialFilters}
      />
    </AdminShell>
  );
}
