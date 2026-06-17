"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { ObjectList } from "@/features/objects/components/object-list";
import { ObjectDetail } from "@/features/objects/components/object-detail";
import { NewObjectForm } from "@/features/objects/components/new-object-form";
import type { RentUnit } from "@/features/finances/services/rent-units.service";
import type { Contract } from "@/types/contract";
import type { ImmoDocument } from "@/types/document";
import type { MeterDefinition, ReadingCampaign } from "@/types/meter-reading";
import {
  createObject,
  type CreateObjectInput,
} from "@/features/objects/services/objects.service";
import type { ImmoObject } from "@/types/object";
import type { Tenant } from "@/types/tenant";

type ObjectsModuleProps = {
  initialObjects: ImmoObject[];
  documents: ImmoDocument[];
  tenants?: Tenant[];
  contracts?: Contract[];
  rentUnits?: RentUnit[];
  meters?: MeterDefinition[];
  readingCampaigns?: ReadingCampaign[];
};

function sortObjectsByDisplayId(objects: ImmoObject[]): ImmoObject[] {
  return [...objects].sort((a, b) => a.displayId.localeCompare(b.displayId));
}

export function ObjectsModule({
  initialObjects,
  documents,
  tenants = [],
  contracts = [],
  rentUnits = [],
  meters = [],
  readingCampaigns = [],
}: ObjectsModuleProps) {
  const [objects, setObjects] = useState<ImmoObject[]>(
    sortObjectsByDisplayId(initialObjects)
  );
  const [selectedObjectId, setSelectedObjectId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredObjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return objects;
    }

    return objects.filter((object) => {
      return (
        object.name.toLowerCase().includes(term) ||
        object.address.toLowerCase().includes(term) ||
        object.status.toLowerCase().includes(term) ||
        object.type.toLowerCase().includes(term) ||
        object.displayId.toLowerCase().includes(term)
      );
    });
  }, [objects, searchTerm]);

  const selectedObject = objects.find((object) => object.id === selectedObjectId);
  const totalUnits = objects.reduce((sum, object) => sum + object.units, 0);
  const activeObjects = objects.filter((object) => object.status === "Aktiv").length;

  async function handleCreateObject(input: CreateObjectInput) {
    try {
      setError(null);
      const newObject = await createObject(input);
      setObjects((current) => sortObjectsByDisplayId([...current, newObject]));
      setSelectedObjectId(newObject.id);
      setSearchTerm("");
      setShowCreateForm(false);
    } catch {
      setError("Objekt konnte nicht angelegt werden.");
    }
  }

  function handleSelectObject(id: string) {
    setSelectedObjectId(id);
  }

  function handleBackToList() {
    setSelectedObjectId("");
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Objekte</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Objekt auswählen und danach im Detail weiterarbeiten.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((current) => !current)}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          {showCreateForm ? "Formular schließen" : "+ Neues Objekt"}
        </button>
      </div>

      {showCreateForm ? <NewObjectForm onCreate={handleCreateObject} /> : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {selectedObject ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Aktiver Objektanker:{" "}
          <span className="font-semibold">
            {selectedObject.displayId}
          </span>
        </div>
      ) : null}

      {selectedObject ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleBackToList}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              ← Zurück zur Objektliste
            </button>

            <p className="text-sm text-zinc-500">
              Arbeitsmodus für {selectedObject.displayId} · {selectedObject.name}
            </p>
          </div>

          <ObjectDetail
            object={selectedObject}
            documents={documents}
            tenants={tenants}
            contracts={contracts}
            rentUnits={rentUnits}
            meterDefinitions={meters}
            readingCampaigns={readingCampaigns}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_160px_160px_160px]">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Suche
              </label>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Objekt, Adresse, Typ oder Status suchen"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
              />
            </div>

            <StatCard label="Gesamt" value={objects.length} />
            <StatCard label="Aktiv" value={activeObjects} />
            <StatCard label="Einheiten" value={totalUnits} />
          </div>

          <ObjectList
            objects={filteredObjects}
            selectedObjectId={selectedObjectId}
            onSelect={handleSelectObject}
          />
        </>
      )}
    </section>
  );
}
