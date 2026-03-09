import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ImmoDocument } from "@/types/document";

type DocumentsModuleProps = {
  documents: ImmoDocument[];
};

function getDocumentVariant(status: string) {
  switch (status) {
    case "Vorhanden":
      return "success";
    case "In Prüfung":
      return "warning";
    case "Fehlt":
      return "danger";
    default:
      return "muted";
  }
}

export function DocumentsModule({ documents }: DocumentsModuleProps) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dokumente</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Zentrale Dokumentenablage für Objekte, Mieter und Verträge.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Gesamt" value={documents.length} />
        <StatCard
          label="In Prüfung"
          value={documents.filter((item) => item.status === "In Prüfung").length}
        />
        <StatCard
          label="Fehlend"
          value={documents.filter((item) => item.status === "Fehlt").length}
        />
      </div>

      <SectionCard
        title="Dokumentenliste"
        description="Erste Arbeitsansicht für Kategorien, Objektbezug und Status."
      >
        <div className="space-y-3">
          {documents.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600">{item.objectName}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={item.category} variant="muted" />
                  <StatusBadge
                    label={item.status}
                    variant={getDocumentVariant(item.status)}
                  />
                </div>
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                Letzte Änderung: {item.updatedAt}
              </p>
            </article>
          ))}
        </div>
      </SectionCard>
    </section>
  );
}
