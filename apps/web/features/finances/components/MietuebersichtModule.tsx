"use client";

import { useEffect, useState } from "react";

type RentUnit = {
  id: string;
  objectId: string;
  unitLabel: string;
  tenant: string;
  sollMiete: number;
  istMiete: number;
  zahlungsStatus: string;
  faelligAm: string;
};

export function MietuebersichtModule() {
  const [units, setUnits] = useState<RentUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ objectId: "", unitLabel: "", tenant: "", sollMiete: "", istMiete: "", zahlungsStatus: "Offen", faelligAm: "" });

  useEffect(() => {
    fetch("http://localhost:3000/rent-units")
      .then((r) => r.json())
      .then((data) => { setUnits(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleCreate() {
    const res = await fetch("http://localhost:3000/rent-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sollMiete: parseFloat(form.sollMiete), istMiete: parseFloat(form.istMiete || "0") }),
    });
    const newUnit = await res.json();
    setUnits((prev) => [...prev, newUnit]);
    setShowForm(false);
    setForm({ objectId: "", unitLabel: "", tenant: "", sollMiete: "", istMiete: "", zahlungsStatus: "Offen", faelligAm: "" });
  }

  async function handleDelete(id: string) {
    await fetch(`http://localhost:3000/rent-units/${id}`, { method: "DELETE" });
    setUnits((prev) => prev.filter((u) => u.id !== id));
  }

  const totalSoll = units.reduce((s, u) => s + u.sollMiete, 0);
  const totalIst = units.reduce((s, u) => s + u.istMiete, 0);
  const rueckstand = totalSoll - totalIst;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Soll-Miete</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{totalSoll.toFixed(2)} €</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Ist-Miete</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{totalIst.toFixed(2)} €</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Rückstand</p>
          <p className={`mt-2 text-2xl font-semibold ${rueckstand > 0 ? "text-rose-600" : "text-emerald-600"}`}>{rueckstand.toFixed(2)} €</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition">
          {showForm ? "Abbrechen" : "+ Einheit anlegen"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-zinc-900">Neue Mieteinheit</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {[["Objekt-ID", "objectId"], ["Einheit", "unitLabel"], ["Mieter", "tenant"], ["Soll-Miete", "sollMiete"], ["Ist-Miete", "istMiete"], ["Fällig am", "faelligAm"]].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
                <input value={form[key as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Status</label>
              <select value={form.zahlungsStatus} onChange={(e) => setForm((f) => ({ ...f, zahlungsStatus: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
                <option>Offen</option>
                <option>Bezahlt</option>
                <option>Rückstand</option>
              </select>
            </div>
          </div>
          <button type="button" onClick={handleCreate} className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition">Speichern</button>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_100px_100px_80px] gap-3 px-4 py-3 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <div>Einheit</div><div>Mieter</div><div>Fällig</div><div>Soll</div><div>Ist</div><div>Status</div>
        </div>
        {loading ? (
          <p className="px-4 py-6 text-sm text-zinc-500">Lädt...</p>
        ) : units.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">Keine Einheiten vorhanden.</p>
        ) : units.map((u) => (
          <div key={u.id} className="grid grid-cols-[1fr_1fr_1fr_100px_100px_80px] gap-3 px-4 py-4 border-t border-zinc-100 text-sm items-center">
            <div className="font-medium text-zinc-900">{u.unitLabel}</div>
            <div className="text-zinc-700">{u.tenant}</div>
            <div className="text-zinc-500">{u.faelligAm}</div>
            <div className="text-zinc-700">{u.sollMiete.toFixed(2)} €</div>
            <div className="text-zinc-700">{u.istMiete.toFixed(2)} €</div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.zahlungsStatus === "Bezahlt" ? "bg-emerald-100 text-emerald-700" : u.zahlungsStatus === "Rückstand" ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"}`}>{u.zahlungsStatus}</span>
              <button type="button" onClick={() => handleDelete(u.id)} className="text-xs text-rose-500 hover:text-rose-700">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}