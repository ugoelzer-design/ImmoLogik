"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createRentUnit,
  deleteRentUnit,
  getRentUnits,
  type RentUnit,
} from "@/features/finances/services/rent-units.service";
import { rentUnitSchema } from "@/lib/validation/schemas";

const statusOptions = ["Alle", "Offen", "Bezahlt", "Rückstand"] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function statusClass(status: string) {
  if (status === "Bezahlt") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "Rückstand") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-zinc-100 text-zinc-600";
}

export function MietuebersichtModule() {
  const [units, setUnits] = useState<RentUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ objectId: "", unitLabel: "", tenant: "", sollMiete: "", istMiete: "", zahlungsStatus: "Offen", faelligAm: "" });
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("Alle");

  useEffect(() => {
    getRentUnits()
      .then((data) => {
        setUnits(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Mieteinheiten konnten nicht geladen werden.");
        setLoading(false);
      });
  }, []);

  async function handleCreate() {
    const validation = rentUnitSchema.safeParse(form);
    if (!validation.success) {
      setError(
        validation.error.issues[0]?.message ??
          "Bitte alle Felder korrekt ausfüllen.",
      );
      return;
    }

    try {
      setError(null);
      const payload = validation.data;
      const newUnit = await createRentUnit({
        ...payload,
        sollMiete: Number(payload.sollMiete),
        istMiete: Number(payload.istMiete || "0"),
      });
      setUnits((prev) => [...prev, newUnit]);
      setShowForm(false);
      setForm({ objectId: "", unitLabel: "", tenant: "", sollMiete: "", istMiete: "", zahlungsStatus: "Offen", faelligAm: "" });
    } catch {
      setError("Mieteinheit konnte nicht angelegt werden.");
    }
  }

  async function handleDelete(id: string) {
    try {
      setError(null);
      await deleteRentUnit(id);
      setUnits((prev) => prev.filter((u) => u.id !== id));
    } catch {
      setError("Mieteinheit konnte nicht gelöscht werden.");
    }
  }

  const filteredUnits = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return units.filter((unit) => {
      const matchesQuery =
        !normalizedQuery ||
        [unit.objectId, unit.unitLabel, unit.tenant, unit.faelligAm]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesStatus = statusFilter === "Alle" || unit.zahlungsStatus === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, units]);

  const totalSoll = units.reduce((s, u) => s + u.sollMiete, 0);
  const totalIst = units.reduce((s, u) => s + u.istMiete, 0);
  const rueckstand = totalSoll - totalIst;
  const openCount = units.filter((u) => u.zahlungsStatus !== "Bezahlt").length;
  const arrearsCount = units.filter((u) => u.sollMiete > u.istMiete).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Soll-Miete</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatCurrency(totalSoll)}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Ist-Miete</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatCurrency(totalIst)}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Rückstand</p>
          <p className={`mt-2 text-2xl font-semibold ${rueckstand > 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatCurrency(rueckstand)}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Klärung</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{openCount}</p>
          <p className="mt-1 text-xs text-zinc-500">{arrearsCount} mit Differenz</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] lg:w-[560px]">
          <label className="sr-only" htmlFor="rent-search">Mieteinheiten suchen</label>
          <input
            id="rent-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Suche nach Einheit, Mieter, Objekt oder Datum"
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400"
          />
          <label className="sr-only" htmlFor="rent-status-filter">Zahlungsstatus filtern</label>
          <select
            id="rent-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as (typeof statusOptions)[number])}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400"
          >
            {statusOptions.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition">
          {showForm ? "Abbrechen" : "+ Einheit anlegen"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {showForm && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-zinc-900">Neue Mieteinheit</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {[["Objekt-ID", "objectId"], ["Einheit", "unitLabel"], ["Mieter", "tenant"], ["Soll-Miete", "sollMiete"], ["Ist-Miete", "istMiete"], ["Fällig am", "faelligAm"]].map(([label, key]) => (
              <div key={key}>
                <label htmlFor={`rent-${key}`} className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
                <input id={`rent-${key}`} value={form[key as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
              </div>
            ))}
            <div>
              <label htmlFor="rent-zahlungsStatus" className="block text-xs font-medium text-zinc-500 mb-1">Status</label>
              <select id="rent-zahlungsStatus" value={form.zahlungsStatus} onChange={(e) => setForm((f) => ({ ...f, zahlungsStatus: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
                <option>Offen</option>
                <option>Bezahlt</option>
                <option>Rückstand</option>
              </select>
            </div>
          </div>
          <button type="button" onClick={handleCreate} className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition">Speichern</button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1fr_1fr_1fr_110px_110px_120px] gap-3 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:grid">
          <div>Einheit</div><div>Mieter</div><div>Fällig</div><div>Soll</div><div>Ist</div><div>Status</div>
        </div>
        {loading ? (
          <p className="px-4 py-6 text-sm text-zinc-500">Lädt...</p>
        ) : units.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">Keine Einheiten vorhanden.</p>
        ) : filteredUnits.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">Keine Mieteinheiten passen zur Suche.</p>
        ) : filteredUnits.map((u) => {
          const balance = u.sollMiete - u.istMiete;

          return (
            <div key={u.id} className="border-t border-zinc-100 px-4 py-4 text-sm">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_110px_110px_120px] md:items-center">
                <div>
                  <p className="font-medium text-zinc-900">{u.unitLabel}</p>
                  <p className="mt-1 text-xs text-zinc-500">{u.objectId}</p>
                </div>
                <div className="text-zinc-700">{u.tenant}</div>
                <div className="text-zinc-500">{u.faelligAm}</div>
                <div className="text-zinc-700">{formatCurrency(u.sollMiete)}</div>
                <div>
                  <p className="text-zinc-700">{formatCurrency(u.istMiete)}</p>
                  {balance > 0 ? <p className="mt-1 text-xs text-rose-600">offen {formatCurrency(balance)}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(u.zahlungsStatus)}`}>{u.zahlungsStatus}</span>
                  <button type="button" onClick={() => handleDelete(u.id)} className="text-xs text-rose-500 hover:text-rose-700" aria-label={`${u.unitLabel} löschen`}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
