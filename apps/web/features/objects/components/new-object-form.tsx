"use client";

import { useEffect, useState } from "react";
import {
  getNextObjectDisplayId,
  type CreateObjectInput,
} from "@/features/objects/services/objects.service";
import { objectSchema } from "@/lib/validation/schemas";

type NewObjectFormProps = {
  onCreate: (input: CreateObjectInput) => Promise<void> | void;
};

type FieldErrors = Partial<Record<"name" | "address" | "units", string>>;

const DEFAULT_UNITS_VALUE = "1";

export function NewObjectForm({ onCreate }: NewObjectFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [units, setUnits] = useState(DEFAULT_UNITS_VALUE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayIdPreview, setDisplayIdPreview] = useState("");
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDisplayIdPreview() {
      try {
        const nextDisplayId = await getNextObjectDisplayId();
        if (!isMounted) {
          return;
        }

        setDisplayIdPreview(nextDisplayId);
        setPreviewError(false);
      } catch {
        if (!isMounted) {
          return;
        }

        setDisplayIdPreview("");
        setPreviewError(true);
      }
    }

    void loadDisplayIdPreview();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const result = objectSchema.safeParse({
      name,
      address,
      units: Number(units.trim()),
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        address: fieldErrors.address?.[0],
        units: fieldErrors.units?.[0],
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreate(result.data);
      setName("");
      setAddress("");
      setUnits(DEFAULT_UNITS_VALUE);
      const nextDisplayId = await getNextObjectDisplayId();
      setDisplayIdPreview(nextDisplayId);
      setPreviewError(false);
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
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Nächste Objekt-ID:{" "}
          <span className="text-zinc-900">
            {displayIdPreview || (previewError ? "derzeit nicht verfügbar" : "wird geladen...")}
          </span>
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
            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400 ${
              errors.name ? "border-red-400" : "border-zinc-200"
            }`}
          />
          {errors.name ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.name}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Adresse
          </label>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Straße, PLZ Ort"
            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400 ${
              errors.address ? "border-red-400" : "border-zinc-200"
            }`}
          />
          {errors.address ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.address}</p>
          ) : null}
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
            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400 ${
              errors.units ? "border-red-400" : "border-zinc-200"
            }`}
          />
          {errors.units ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.units}</p>
          ) : null}
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Wird angelegt..." : "Objekt anlegen"}
          </button>
        </div>
      </form>
    </section>
  );
}
