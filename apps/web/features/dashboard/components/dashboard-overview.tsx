import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";

type DashboardOverviewProps = {
  objectCount: number;
};

const tasks = [
  "Nebenkostenunterlagen für Objekt Bergstraße prüfen",
  "Vertragsverlängerung für Wohnung 2.OG vorbereiten",
  "Fehlende Dokumente für Mieterakte ergänzen",
];

const activities = [
  "Neue WEG angelegt",
  "Mietvertrag für Einheit A-03 aktualisiert",
  "Drei Dokumente einer WEG zugeordnet",
];

export function DashboardOverview({ objectCount }: DashboardOverviewProps) {
  const stats = [
    { label: "WEGs", value: objectCount, hint: "Aktueller Bestand" },
    { label: "Mieter", value: 38, hint: "35 aktiv, 3 ausstehend" },
    { label: "Verträge", value: 34, hint: "4 laufen bald aus" },
    { label: "Dokumente", value: 286, hint: "14 neue Uploads" },
  ];

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Operative Übersicht für WEGs, Verträge, Mieter und Dokumente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Letzte Aktivitäten"
          description="Änderungen aus den wichtigsten Verwaltungsbereichen."
        >
          <ul className="space-y-3">
            {activities.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"
              >
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Aufgaben"
          description="Was als Nächstes im Tagesgeschäft relevant ist."
        >
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li
                key={task}
                className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"
              >
                {task}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </section>
  );
}
