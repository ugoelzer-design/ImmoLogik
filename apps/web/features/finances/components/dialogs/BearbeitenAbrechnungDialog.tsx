"use client";

import { useEffect, useState } from "react";
import type { NebenkostenAbrechnung } from "@/types/nebenkosten";
import { currentDateForDisplay } from "../../utils/nebenkosten-format";

export function BearbeitenAbrechnungDialog({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean;
  item: NebenkostenAbrechnung | null;
  onClose: () => void;
  onSave: (payload: NebenkostenAbrechnung) => void;
}) {
  const [zeitraumVon, setZeitraumVon] = useState("");
  const [zeitraumBis, setZeitraumBis] = useState("");

  useEffect(() => {
    if (!item) return;
    setZeitraumVon(item.zeitraumVon);
    setZeitraumBis(item.zeitraumBis);
  }, [item]);

  if (!open || !item) return null;

  function handleSave() {
    if (!item) return;

    const payload: NebenkostenAbrechnung = {
      id: item.id,
      objektDisplayId: item.objektDisplayId,
      objektName: item.objektName,
      status: item.status,
      erstelltAm: item.erstelltAm,
      positivGeprueftAm: item.positivGeprueftAm,
      zeitraumVon,
      zeitraumBis,
      geaendertAm: currentDateForDisplay(),
    };

    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-6">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Bearbeiten
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-zinc-900">{item.id}</h3>
            <p className="mt-2 text-sm text-zinc-600">
              {item.objektDisplayId} · {item.objektName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800"
          >
            Schließen
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Zeitraum von
            </span>
            <input
              type="date"
              value={zeitraumVon}
              onChange={(event) => setZeitraumVon(event.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Zeitraum bis
            </span>
            <input
              type="date"
              value={zeitraumBis}
              onChange={(event) => setZeitraumBis(event.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
            />
          </label>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-2">
            <p className="text-sm text-zinc-500">Status</p>
            <p className="mt-2 text-sm font-medium text-zinc-900">In Arbeit</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-200 p-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-medium text-white"
          >
            Änderungen übernehmen
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
