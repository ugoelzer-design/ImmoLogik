import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Tenant } from "@/types/tenant";

type TenantsModuleProps = {
  tenants: Tenant[];
};

function getTenantVariant(status: string) {
  switch (status) {
    case "Aktiv":
      return "success";
    case "Ausstehend":
      return "warning";
    case "Beendet":
      return "danger";
    default:
      return "muted";
  }
}

export function TenantsModule({ tenants }: TenantsModuleProps) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mieter</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Übersicht aller Mieter, Kontakte und Statusinformationen.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Gesamt" value={tenants.length} />
        <StatCard
          label="Aktiv"
          value={tenants.filter((item) => item.status === "Aktiv").length}
        />
        <StatCard
          label="Ausstehend"
          value={tenants.filter((item) => item.status === "Ausstehend").length}
        />
      </div>

      <SectionCard
        title="Mieterliste"
        description="Kontakte, Einheiten und Status in einer ersten Verwaltungsansicht."
      >
        <div className="space-y-3">
          {tenants.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">{item.fullName}</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {item.objectName} · {item.unit}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {item.email} · {item.phone}
                  </p>
                </div>

                <StatusBadge
                  label={item.status}
                  variant={getTenantVariant(item.status)}
                />
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </section>
  );
}
