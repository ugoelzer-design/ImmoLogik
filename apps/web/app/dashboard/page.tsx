import { AdminShell } from "@/components/layout/admin-shell";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

async function fetchAll(path: string): Promise<any[]> {
  try {
    const res = await fetch(`${API}${path}`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export default async function DashboardPage() {
  const [objects, mieter, vertraege, dokumente, rentUnits] = await Promise.all([
    fetchAll("/objects"),
    fetchAll("/tenants"),
    fetchAll("/contracts"),
    fetchAll("/documents"),
    fetchAll("/rent-units"),
  ]);

  const recentActivities = [
    ...objects.slice(0, 2).map((o: any) => ({ text: `WEG angelegt: ${o.name}`, date: o.createdAt })),
    ...dokumente.slice(0, 2).map((d: any) => ({ text: `Dokument hochgeladen: ${d.title}`, date: d.createdAt })),
    ...rentUnits.slice(0, 2).map((r: any) => ({ text: `Mieteinheit angelegt: ${r.unitLabel}`, date: r.createdAt })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const vertraegeAblaufend = vertraege.filter((v: any) => v.status === "Läuft aus" || v.status === "In Prüfung").length;
  const mieterAktiv = mieter.filter((m: any) => m.status === "Aktiv").length;
  const mieterAusstehend = mieter.filter((m: any) => m.status === "Ausstehend").length;
  const dokNeu = dokumente.filter((d: any) => new Date(d.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;

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