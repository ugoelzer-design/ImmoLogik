"use client";

import { useMemo, useState } from "react";
import type {
  PortalData,
  PortalDokument,
  PortalAblesung,
  PortalVertrag,
} from "../services/mieter-portal.service";
import { getDocumentFileUrl } from "../services/mieter-portal.service";

type Tab = "uebersicht" | "vertrag" | "dokumente" | "ablesungen";

const TABS: { id: Tab; label: string }[] = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "vertrag", label: "Mein Vertrag" },
  { id: "dokumente", label: "Dokumente" },
  { id: "ablesungen", label: "Ablesungen" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("de-DE");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  );
}

function vertragStatusColor(status: string) {
  switch (status) {
    case "Aktiv": return "bg-emerald-100 text-emerald-800";
    case "Läuft aus": return "bg-amber-100 text-amber-800";
    default: return "bg-zinc-100 text-zinc-600";
  }
}

function ablesungStatusColor(status: string) {
  switch (status) {
    case "offen": return "bg-blue-100 text-blue-800";
    case "abgeschlossen": return "bg-emerald-100 text-emerald-800";
    default: return "bg-zinc-100 text-zinc-600";
  }
}

function documentStatusColor(status: string) {
  switch (status) {
    case "Vorhanden": return "bg-emerald-100 text-emerald-800";
    case "In Prüfung": return "bg-amber-100 text-amber-800";
    case "Fehlt": return "bg-rose-100 text-rose-800";
    default: return "bg-zinc-100 text-zinc-600";
  }
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center">
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{text}</p>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function UebersichtTab({ data, token }: { data: PortalData; token: string }) {
  const { mieter, portalAccess } = data;
  const openReadings = data.ablesungen.filter(
    (item) => item.status === "offen" && item.meinZugang?.status === "offen",
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Ihr Bereich
        </p>
        <p className="mt-2 text-sm text-blue-900">
          Hier finden Sie Ihre Stammdaten, Vertragsinformationen, Dokumente und offene Ablesungen.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard label="Name" value={mieter.fullName} />
        <InfoCard label="E-Mail" value={mieter.email} />
        <InfoCard label="Telefon" value={mieter.phone || "—"} />
        <InfoCard label="Status" value={mieter.status} />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Meine Einheit</p>
        <p className="mt-2 text-lg font-semibold text-zinc-900">
          {mieter.objectDisplayId} · {mieter.objectName}
        </p>
        <p className="mt-1 text-sm text-zinc-600">{mieter.objectAddress}</p>
        <p className="mt-1 text-sm text-zinc-600">Einheit: {mieter.unit}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <InfoCard label="Soll-Miete" value={formatMoney(mieter.sollMiete)} />
        <InfoCard label="Zahlungsstatus" value={mieter.zahlungsStatus} />
        <InfoCard label="Fällig am" value={mieter.faelligAm} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <InfoCard label="Verträge" value={String(data.vertraege.length)} />
        <InfoCard label="Dokumente" value={String(data.dokumente.length)} />
        <InfoCard label="Offene Ablesungen" value={String(openReadings)} />
      </div>

      <p className="text-xs text-zinc-400">
        Portal-Zugang gültig bis {formatDate(portalAccess.expiresAt)}
      </p>
    </div>
  );
}

function VertragTab({ vertraege }: { vertraege: PortalVertrag[] }) {
  if (vertraege.length === 0) {
    return (
      <EmptyState
        title="Kein Vertrag hinterlegt"
        text="Sobald ein Vertrag freigegeben ist, erscheint er hier."
      />
    );
  }
  return (
    <div className="space-y-4">
      {vertraege.map((v) => (
        <div key={v.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-zinc-900">{v.title}</p>
              <p className="mt-1 text-sm text-zinc-600">
                {v.startDate} – {v.endDate}
              </p>
            </div>
            <StatusChip label={v.status} color={vertragStatusColor(v.status)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DokumenteTab({
  dokumente,
  token,
}: {
  dokumente: PortalDokument[];
  token: string;
}) {
  const groupedDocuments = useMemo(() => {
    return dokumente.reduce<Record<string, PortalDokument[]>>((groups, doc) => {
      const key = doc.category || "Sonstiges";
      return {
        ...groups,
        [key]: [...(groups[key] ?? []), doc],
      };
    }, {});
  }, [dokumente]);

  if (dokumente.length === 0) {
    return (
      <EmptyState
        title="Keine Dokumente vorhanden"
        text="Freigegebene Dokumente werden hier automatisch angezeigt."
      />
    );
  }

  return (
    <div className="space-y-5">
      {Object.entries(groupedDocuments).map(([category, items]) => (
        <section key={category} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-900">{category}</h2>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
              {items.length}
            </span>
          </div>

          {items.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">{doc.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {doc.fileName} · {formatBytes(doc.size)} · {formatDate(doc.createdAt)}
                </p>
                <div className="mt-2">
                  <StatusChip label={doc.status} color={documentStatusColor(doc.status)} />
                </div>
              </div>
              <a
                href={getDocumentFileUrl(token, doc.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-center text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Öffnen
              </a>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function AblesungenTab({ ablesungen }: { ablesungen: PortalAblesung[] }) {
  if (ablesungen.length === 0) {
    return (
      <EmptyState
        title="Keine Ablesungen vorhanden"
        text="Wenn eine Jahresablesung freigegeben wird, erscheint sie hier."
      />
    );
  }
  return (
    <div className="space-y-4">
      {ablesungen.map((a) => {
        const zugang = a.meinZugang;
        const isOffen = a.status === "offen" && zugang?.status === "offen";
        const isExpired =
          zugang?.expiresAt && new Date(zugang.expiresAt) < new Date();

        return (
          <div key={a.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-zinc-900">
                  Ablesejahr {a.reportYear}
                </p>
                {zugang?.submittedAt ? (
                  <p className="mt-1 text-sm text-zinc-600">
                    Eingereicht am {formatDate(zugang.submittedAt)}
                  </p>
                ) : zugang?.expiresAt ? (
                  <p className="mt-1 text-sm text-zinc-600">
                    Frist: {formatDate(zugang.expiresAt)}
                  </p>
                ) : null}
              </div>
              <StatusChip
                label={zugang?.status ?? a.status}
                color={ablesungStatusColor(zugang?.status ?? a.status)}
              />
            </div>

            {isOffen && !isExpired && zugang && (
              <a
                href={`/ablesungen/${zugang.token}`}
                className="mt-4 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                Zählerstände einreichen →
              </a>
            )}
            {isExpired && (
              <p className="mt-3 text-xs text-rose-600">Abgabefrist abgelaufen.</p>
            )}
            {!zugang && (
              <p className="mt-3 text-xs text-zinc-500">
                Für diese Kampagne ist aktuell kein Zugang hinterlegt.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export function PortalView({ data, token }: { data: PortalData; token: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("uebersicht");

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Mieterportal
          </p>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900">
            {data.mieter.fullName}
          </h1>
          <p className="text-sm text-zinc-500">
            {data.mieter.objectDisplayId} · {data.mieter.unit}
          </p>
        </div>

        {/* Tab-Navigation */}
        <div className="mx-auto max-w-3xl px-4">
          <nav className="flex gap-1 overflow-x-auto pb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Inhalt */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        {activeTab === "uebersicht" && (
          <UebersichtTab data={data} token={token} />
        )}
        {activeTab === "vertrag" && <VertragTab vertraege={data.vertraege} />}
        {activeTab === "dokumente" && (
          <DokumenteTab dokumente={data.dokumente} token={token} />
        )}
        {activeTab === "ablesungen" && (
          <AblesungenTab ablesungen={data.ablesungen} />
        )}
      </div>
    </main>
  );
}
