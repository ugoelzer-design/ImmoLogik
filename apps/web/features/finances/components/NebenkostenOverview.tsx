"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listUtilityStatements,
  type UtilityStatementsListSettlement,
} from "../services/utility-statements.service";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE").format(date);
}

function getYear(value: UtilityStatementsListSettlement) {
  if (value.reportYear) return String(value.reportYear);
  const date = new Date(value.zeitraumBis);
  return Number.isNaN(date.getTime()) ? "-" : String(date.getFullYear());
}

export function NebenkostenOverview() {
  const [items, setItems] = useState<UtilityStatementsListSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listUtilityStatements()
      .then((response) => {
        setItems(response.settlements);
        setError(null);
      })
      .catch(() => {
        setItems([]);
        setError("Nebenkostenübersicht konnte nicht geladen werden.");
      })
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const active = items.filter((item) => item.status === "In Arbeit");
    const archived = items.filter((item) => item.status === "Archiviert");
    const years = new Set(items.map(getYear).filter((year) => year !== "-"));

    return {
      total: items.length,
      active: active.length,
      archived: archived.length,
      years: years.size,
      latest: [...items].sort((a, b) => {
        return new Date(b.geaendertAm).getTime() - new Date(a.geaendertAm).getTime();
      })[0],
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Abrechnungen" value={metrics.total} />
        <MetricCard label="In Arbeit" value={metrics.active} tone="amber" />
        <MetricCard label="Archiviert" value={metrics.archived} tone="emerald" />
        <MetricCard label="Jahre" value={metrics.years} />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Übersicht</p>
            <h3 className="mt-2 text-xl font-semibold text-zinc-900">Nebenkosten</h3>
          </div>
          {metrics.latest ? (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
              Zuletzt geändert: {formatDate(metrics.latest.geaendertAm)}
            </span>
          ) : null}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-500">Lädt...</p>
        ) : error ? (
          <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">Noch keine Nebenkostenabrechnungen vorhanden.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200">
            <div className="hidden grid-cols-[1fr_120px_120px_140px] gap-3 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:grid">
              <div>Objekt</div>
              <div>Jahr</div>
              <div>Status</div>
              <div>Geändert</div>
            </div>
            {items.slice(0, 5).map((item) => (
              <div key={item.id} className="border-t border-zinc-100 px-4 py-4 text-sm first:border-t-0">
                <div className="grid gap-2 md:grid-cols-[1fr_120px_120px_140px] md:items-center">
                  <div>
                    <p className="font-medium text-zinc-900">{item.objektName}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.objektDisplayId}</p>
                  </div>
                  <div className="text-zinc-600">{getYear(item)}</div>
                  <div>
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        item.status === "Archiviert"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700",
                      ].join(" ")}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="text-zinc-500">{formatDate(item.geaendertAm)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: number;
  tone?: "zinc" | "amber" | "emerald";
}) {
  const valueClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "emerald"
        ? "text-emerald-700"
        : "text-zinc-900";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
