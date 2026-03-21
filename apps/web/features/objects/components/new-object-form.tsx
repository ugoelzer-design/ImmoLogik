"use client";

import { useState } from "react";
import type { CreateObjectInput } from "@/features/objects/services/objects.service";

type NewObjectFormProps = {
  onCreate: (input: CreateObjectInput) => Promise<void> | void;
};

const DEFAULT_UNITS_VALUE = "1";

export function NewObjectForm({ onCreate }: NewObjectFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [units, setUnits] = useState(DEFAULT_UNITS_VALUE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedUnitsValue = units.trim();
  const unitsNumber = Number(normalizedUnitsValue);
  const isUnitsValid =
    normalizedUnitsValue !== "" &&
    Number.isInteger(unitsNumber) &&
    unitsNumber >= 1;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !address.trim() || !isUnitsValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreate({
        name: name.trim(),
        address: address.trim(),
        units: unitsNumber,
      });

      setName("");
      setAddress("");
      setUnits(DEFAULT_UNITS_VALUE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Neues Objekt</h2>
        <p className="text-sm text-zinc-500">
          Schnelles Anlegen eines neuen Objekts mit erstem Detailstatus.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_160px_220px]"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Bezeichnung
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. MFH Gartenstraße 12"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Adresse
          </label>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Straße, PLZ Ort"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Einheiten
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={units}
            onChange={(event) => setUnits(event.target.value)}
            placeholder="1"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
          />
          {!isUnitsValid ? (
            <p className="mt-2 text-xs font-medium text-red-600">
              Bitte mindestens 1 Einheit als ganze Zahl eingeben.
            </p>
          ) : null}
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isSubmitting || !isUnitsValid}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Wird angelegt..." : "Objekt anlegen"}
          </button>
        </div>
      </form>
    </section>
  );
}
