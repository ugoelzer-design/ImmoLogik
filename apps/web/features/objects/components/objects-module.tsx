"use client";

import { useMemo, useState } from "react";
import { ObjectList } from "@/features/objects/components/object-list";
import { ObjectDetail } from "@/features/objects/components/object-detail";
import { NewObjectForm } from "@/features/objects/components/new-object-form";
import {
  createObject,
  type CreateObjectInput,
} from "@/features/objects/services/objects.service";
import type { ImmoObject } from "@/types/object";

type ObjectsModuleProps = {
  initialObjects: ImmoObject[];
};

export function ObjectsModule({ initialObjects }: ObjectsModuleProps) {
  const [objects, setObjects] = useState<ImmoObject[]>(initialObjects);
  const [selectedObjectId, setSelectedObjectId] = useState<string>(
    initialObjects[0]?.id ?? ""
  );
  const [searchTerm, setSearchTerm] = useState("");
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
        object.type.toLowerCase().includes(term)
      );
    });
  }, [objects, searchTerm]);

  const selectedObject =
    filteredObjects.find((object) => object.id === selectedObjectId) ??
    objects.find((object) => object.id === selectedObjectId) ??
    filteredObjects[0] ??
    objects[0];

  async function handleCreateObject(input: CreateObjectInput) {
    try {
      setError(null);
      const newObject = await createObject(input);
      setObjects((current) => [newObject, ...current]);
      setSelectedObjectId(newObject.id);
      setSearchTerm("");
    } catch {
      setError("Objekt konnte nicht angelegt werden.");
    }
  }

  function handleSelectObject(id: string) {
    setSelectedObjectId(id);
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Objekte</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Objektverwaltung als zentraler Arbeitsbereich für Bestand und neue
          Einträge.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <NewObjectForm onCreate={handleCreateObject} />
          <ObjectList
            objects={filteredObjects}
            selectedObjectId={selectedObject?.id ?? ""}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSelect={handleSelectObject}
          />
        </div>

        <ObjectDetail object={selectedObject} />
      </div>
    </section>
  );
}
