"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import type { ImmoObject } from "@/types/object";

type ObjectListProps = {
  objects: ImmoObject[];
  selectedObjectId: string;
  onSelect: (id: string) => void;
};

function getCity(address: string) {
  const parts = address.split(",");
  return parts[parts.length - 1]?.trim() || address;
}

function getStatusVariant(status: ImmoObject["status"]) {
  switch (status) {
    case "Aktiv":
      return "success";
    case "In Prüfung":
      return "warning";
    case "Neu":
      return "default";
    default:
      return "muted";
  }
}

export function ObjectList({
  objects,
  selectedObjectId,
  onSelect,
}: ObjectListProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Objektliste</h2>
        <p className="text-sm text-zinc-500">
          Auswahl und Schnellzugriff auf Objekte.
        </p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_110px_130px] gap-3 rounded-xl bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <div>Bezeichnung</div>
          <div>Ort</div>
          <div>Einheiten</div>
          <div>Status</div>
        </div>

        {objects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-sm text-zinc-500">
            Keine Objekte gefunden.
          </div>
        ) : (
          objects.map((object) => {
            const isActive = object.id === selectedObjectId;

            return (
              <div
                key={object.id}
                className={`grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_110px_130px] gap-3 rounded-xl border px-4 py-4 transition ${
                  isActive
                    ? "border-blue-200 bg-blue-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(object.id)}
                  className="col-span-4 grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_110px_130px] gap-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {object.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {object.address}
                    </p>
                  </div>

                  <div className="text-sm text-zinc-700">{getCity(object.address)}</div>

                  <div className="text-sm text-zinc-700">{object.units}</div>

                  <div>
                    <StatusBadge
                      label={object.status}
                      variant={getStatusVariant(object.status)}
                    />
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
