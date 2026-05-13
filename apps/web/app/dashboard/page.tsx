import { AdminShell } from "@/components/layout/admin-shell";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";
import {
  buildRecentActivities,
  countRecentDocuments,
} from "@/features/dashboard/utils/dashboard-metrics";
import { API_BASE_URL } from "@/lib/api/client";
import type { Contract } from "@/types/contract";
import type { ImmoDocument } from "@/types/document";
import type { ImmoObject } from "@/types/object";
import type { Tenant } from "@/types/tenant";

type RentUnit = { id: string; unitLabel: string; createdAt: string };

async function fetchAll<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json() as Promise<T[]>;
  } catch { return []; }
}

export default async function DashboardPage() {
  const [objects, mieter, vertraege, dokumente, rentUnits] = await Promise.all([
    fetchAll<ImmoObject>("/objects"),
    fetchAll<Tenant>("/tenants"),
    fetchAll<Contract>("/contracts"),
    fetchAll<ImmoDocument>("/documents"),
    fetchAll<RentUnit>("/rent-units"),
  ]);

  const recentActivities = buildRecentActivities(objects, dokumente, rentUnits);

  const vertraegeAblaufend = vertraege.filter((v) => v.status === "Läuft aus" || v.status === "In Prüfung").length;
  const mieterAktiv = mieter.filter((m) => m.status === "Aktiv").length;
  const mieterAusstehend = mieter.filter((m) => m.status === "Ausstehend").length;
  const dokNeu = countRecentDocuments(dokumente);

  return (
    <AdminShell>
      <DashboardOverview
        objectCount={objects.length}
        mieterCount={mieter.length}
        mieterAktiv={mieterAktiv}
        mieterAusstehend={mieterAusstehend}
        vertraegeCount={vertraege.length}
        vertraegeAblaufend={vertraegeAblaufend}
        dokumenteCount={dokumente.length}
        dokumenteNeu={dokNeu}
        recentActivities={recentActivities}
      />
    </AdminShell>
  );
}
