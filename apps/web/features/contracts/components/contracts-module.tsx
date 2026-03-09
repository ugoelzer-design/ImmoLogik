import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Contract } from "@/types/contract";

type ContractsModuleProps = {
  contracts: Contract[];
};

function getContractVariant(status: string) {
  switch (status) {
    case "Aktiv":
      return "success";
    case "In Prüfung":
      return "warning";
    case "Läuft aus":
      return "danger";
    default:
      return "muted";
  }
}

export function ContractsModule({ contracts }: ContractsModuleProps) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verträge</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Vertragsübersicht mit Laufzeiten, Status und Zuordnung.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Gesamt" value={contracts.length} />
        <StatCard
          label="Aktiv"
          value={contracts.filter((item) => item.status === "Aktiv").length}
        />
        <StatCard
          label="Kritisch"
          value={
            contracts.filter(
              (item) => item.status === "Läuft aus" || item.status === "In Prüfung"
            ).length
          }
        />
      </div>

      <SectionCard
        title="Vertragsliste"
        description="Laufzeiten, Mieterbezug und Status in einer ersten Arbeitsansicht."
      >
        <div className="space-y-3">
          {contracts.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {item.objectName} · {item.tenantName}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {item.startDate} bis {item.endDate}
                  </p>
                </div>

                <StatusBadge
                  label={item.status}
                  variant={getContractVariant(item.status)}
                />
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </section>
  );
}
