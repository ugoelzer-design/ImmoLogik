"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { createReadingCampaign } from "@/features/meter-readings/services/meter-readings.service";
import { readingCampaignSchema } from "@/lib/validation/schemas";
import type { ImmoObject } from "@/types/object";
import type { ReadingCampaign } from "@/types/meter-reading";

type ReadingCampaignsModuleProps = {
  objects: ImmoObject[];
  initialCampaigns: ReadingCampaign[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "offen";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function ReadingCampaignsModule({
  objects,
  initialCampaigns,
}: ReadingCampaignsModuleProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [objectId, setObjectId] = useState(objects[0]?.id ?? "");
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) => {
        if (!objectId) {
          return true;
        }

        return campaign.objectId === objectId;
      }),
    [campaigns, objectId],
  );

  const stats = useMemo(
    () => ({
      campaigns: filteredCampaigns.length,
      recipients: filteredCampaigns.reduce((sum, campaign) => sum + campaign.recipients.length, 0),
      submitted: filteredCampaigns.reduce(
        (sum, campaign) =>
          sum + campaign.recipients.filter((recipient) => recipient.status === "eingereicht").length,
        0,
      ),
    }),
    [filteredCampaigns],
  );

  async function handleGenerate() {
    const validation = readingCampaignSchema.safeParse({ objectId, reportYear });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Bitte WEG und Berichtsjahr auswählen.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const campaign = await createReadingCampaign({
        objectId: validation.data.objectId,
        reportYear: Number(validation.data.reportYear),
      });

      setCampaigns((current) => {
        const remaining = current.filter((item) => item.id !== campaign.id);
        return [campaign, ...remaining].sort((a, b) => b.reportYear - a.reportYear);
      });
    } catch {
      setError("Jahreszugänge konnten nicht erzeugt werden.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      setError("Link konnte nicht in die Zwischenablage kopiert werden.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ablesungen</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Jahreszugänge pro WEG mit einem Klick erzeugen und an alle aktiven Mieter verteilen.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Kampagnen" value={stats.campaigns} />
        <StatCard label="Empfänger" value={stats.recipients} />
        <StatCard label="Eingereicht" value={stats.submitted} />
      </div>

      <SectionCard
        title="Jahreszugänge erzeugen"
        description="Eine Kampagne pro WEG und Jahr. Standardzähler für Heizung, Kaltwasser und Warmwasser werden dabei automatisch vorbereitet."
      >
        <div className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_220px]">
            <select
              value={objectId}
              onChange={(event) => setObjectId(event.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            >
              <option value="">WEG auswählen</option>
              {objects.map((object) => (
                <option key={object.id} value={object.id}>
                  {object.displayId} · {object.name}
                </option>
              ))}
            </select>

            <input
              value={reportYear}
              onChange={(event) => setReportYear(event.target.value)}
              inputMode="numeric"
              placeholder="2026"
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />

            <button
              type="button"
              onClick={handleGenerate}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Erzeuge Zugänge..." : "Zugänge für alle Mieter erzeugen"}
            </button>
          </div>
        </div>
      </SectionCard>

      <div className="space-y-4">
        {filteredCampaigns.map((campaign) => (
          <SectionCard
            key={campaign.id}
            title={`${campaign.object.displayId} · ${campaign.object.name}`}
            description={`Berichtsjahr ${campaign.reportYear} · Ablauf ${formatDate(campaign.expiresAt)}`}
          >
            <div className="space-y-3">
              {campaign.recipients.map((recipient) => {
                const accessLink =
                  typeof window === "undefined"
                    ? `/ablesungen/${recipient.token}`
                    : `${window.location.origin}/ablesungen/${recipient.token}`;

                return (
                  <div
                    key={recipient.id}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{recipient.tenantName}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {recipient.unitLabel} · {recipient.tenantEmail || "keine E-Mail hinterlegt"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Status: {recipient.status} · Eingereicht: {formatDate(recipient.submittedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={accessLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                      >
                        Eingabemaske öffnen
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(accessLink)}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-3 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-100"
                      >
                        Link kopieren
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ))}
      </div>
    </section>
  );
}
