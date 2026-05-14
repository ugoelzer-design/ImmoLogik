import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";

type Activity = { text: string; date: string };

type DashboardOverviewProps = {
  objectCount: number;
  mieterCount: number;
  mieterAktiv: number;
  mieterAusstehend: number;
  vertraegeCount: number;
  vertraegeAblaufend: number;
  dokumenteCount: number;
  dokumenteOffen: number;
  ablesekampagnenOffen: number;
  recentActivities: Activity[];
};

export function DashboardOverview({ objectCount, mieterCount, mieterAktiv, mieterAusstehend, vertraegeCount, vertraegeAblaufend, dokumenteCount, dokumenteOffen, ablesekampagnenOffen, recentActivities }: DashboardOverviewProps) {
  const stats = [
    { label: "WEGs", value: objectCount, hint: "Aktueller Bestand" },
    { label: "Mieter", value: mieterCount, hint: `${mieterAktiv} aktiv, ${mieterAusstehend} ausstehend` },
    { label: "Verträge", value: vertraegeCount, hint: vertraegeAblaufend > 0 ? `${vertraegeAblaufend} laufen bald aus` : "Alle aktuell" },
    { label: "Dokumente", value: dokumenteCount, hint: dokumenteOffen > 0 ? `${dokumenteOffen} offene Fälle` : "Keine offenen Fälle" },
    { label: "Ablesungen", value: ablesekampagnenOffen, hint: ablesekampagnenOffen > 0 ? "Offene Kampagnen" : "Keine offenen Kampagnen" },
  ];

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">Operative Übersicht für WEGs, Verträge, Mieter und Dokumente.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Letzte Aktivitäten" description="Zuletzt angelegte oder geänderte Einträge.">
          <ul className="space-y-3">
            {recentActivities.length === 0 ? (
              <li className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">Noch keine Aktivitäten vorhanden.</li>
            ) : recentActivities.map((item, i) => (
              <li key={i} className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                {item.text}
                {item.date && <span className="ml-2 text-xs text-zinc-400">{new Intl.DateTimeFormat("de-DE").format(new Date(item.date))}</span>}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Hinweise" description="Echter Handlungsbedarf aus den aktuellen API-Daten.">
          <ul className="space-y-3">
            {vertraegeAblaufend > 0 && <li className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">{vertraegeAblaufend} Vertrag/Verträge läuft/laufen bald aus</li>}
            {mieterAusstehend > 0 && <li className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">{mieterAusstehend} Mieter ausstehend</li>}
            {dokumenteOffen > 0 && <li className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{dokumenteOffen} offene Dokumentfälle</li>}
            {ablesekampagnenOffen > 0 && <li className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{ablesekampagnenOffen} offene Ablesekampagnen</li>}
            {vertraegeAblaufend === 0 && mieterAusstehend === 0 && dokumenteOffen === 0 && ablesekampagnenOffen === 0 && (
              <li className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Kein akuter Handlungsbedarf.</li>
            )}
          </ul>
        </SectionCard>
      </div>
    </section>
  );
}
