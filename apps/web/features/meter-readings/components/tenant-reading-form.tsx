"use client";

import { useMemo, useState } from "react";
import { submitMeterReadings } from "@/features/meter-readings/services/meter-readings.service";
import { tenantReadingSchema } from "@/lib/validation/schemas";
import type { MeterAccess } from "@/types/meter-reading";

type TenantReadingFormProps = {
  initialAccess: MeterAccess;
};

function formatValue(value: number | null, unit: string) {
  if (value === null) {
    return "noch nicht eingereicht";
  }

  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} ${unit}`;
}

export function TenantReadingForm({ initialAccess }: TenantReadingFormProps) {
  const [access, setAccess] = useState(initialAccess);
  const [readerName, setReaderName] = useState(initialAccess.tenant.fullName);
  const [readingDate, setReadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(initialAccess.meters.map((meter) => [meter.id, ""])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isValid = useMemo(
    () =>
      access.meters.every((meter) => {
        const current = values[meter.id];
        return current !== undefined && current.trim().length > 0;
      }),
    [access.meters, values],
  );

  async function handleSubmit() {
    const validation = tenantReadingSchema.safeParse({
      readerName,
      readingDate,
      readings: access.meters.map((meter) => ({
        meterId: meter.id,
        value: values[meter.id] ?? "",
      })),
    });

    if (!isValid || !validation.success) {
      setError(
        validation.success
          ? "Bitte alle Zählerstände ausfüllen."
          : validation.error.issues[0]?.message ?? "Bitte alle Zählerstände ausfüllen.",
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updated = await submitMeterReadings(access.token, {
        readerName: validation.data.readerName,
        readings: validation.data.readings.map((reading) => ({
          meterId: reading.meterId,
          value: Number(reading.value),
          date: readingDate,
        })),
      });

      setAccess(updated);
      setSuccess("Zählerstände wurden erfolgreich übermittelt.");
    } catch {
      setError("Zählerstände konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10 text-zinc-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
            Jahresablesung {access.reportYear}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {access.object.displayId} · {access.object.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Wohnung {access.rentUnit.unitLabel} für {access.tenant.fullName}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Bitte tragen Sie die aktuellen Zählerstände einmalig für Ihre Einheit ein.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={readerName}
                onChange={(event) => setReaderName(event.target.value)}
                placeholder="Name der ablesenden Person"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
              <input
                type="date"
                value={readingDate}
                onChange={(event) => setReadingDate(event.target.value)}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </div>

            <div className="space-y-3">
              {access.meters.map((meter) => (
                <div
                  key={meter.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{meter.label}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Einheit: {meter.unit}
                        {meter.meterNumber ? ` · Zählernummer ${meter.meterNumber}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Letzte Einreichung: {formatValue(meter.lastSubmittedValue, meter.unit)}
                      </p>
                    </div>

                    <div className="w-full md:w-56">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={values[meter.id] ?? ""}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [meter.id]: event.target.value,
                          }))
                        }
                        placeholder={`Stand in ${meter.unit}`}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Speichere..." : "Zählerstände absenden"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
