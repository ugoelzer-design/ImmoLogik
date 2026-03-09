"use client";

import type { ImmoObject } from "@/types/object";

type ObjectListProps = {
  objects: ImmoObject[];
  selectedObjectId: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
};

export function ObjectList({
  objects,
  selectedObjectId,
  searchTerm,
  onSearchChange,
  onSelect,
}: ObjectListProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Objektliste</h2>
        <p className="text-sm text-zinc-500">
          Suche, Auswahl und Schnellzugriff auf Objekte.
        </p>
      </div>

      <div className="mb-4">
        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Objekt suchen..."
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
        />
      </div>

      <div className="space-y-3">
        {objects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500">
            Keine Objekte gefunden.
          </div>
        ) : (
          objects.map((object) => {
            const isActive = object.id === selectedObjectId;

            return (
              <button
                key={object.id}
                type="button"
                onClick={() => onSelect(object.id)}
                className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                  isActive
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{object.name}</p>
                    <p
                      className={`mt-1 text-xs ${
                        isActive ? "text-zinc-200" : "text-zinc-500"
                      }`}
                    >
                      {object.address}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {object.status}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}