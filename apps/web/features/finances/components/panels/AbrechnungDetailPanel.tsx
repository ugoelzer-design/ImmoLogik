"use client";

import { InfoRow } from "../shared/InfoRow";
import { StatusPill } from "../shared/StatusPill";
import {
  formatZeitraum,
  statusTone,
} from "../../utils/nebenkosten-format";
import type { NebenkostenAbrechnung } from "@/types/nebenkosten";

export function AbrechnungDetailPanel({
  item,
}: {
  item: NebenkostenAbrechnung | null;
}) {
  if (!item) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Geöffnete Abrechnung
          </p>
          <h4 className="mt-2 text-xl font-semibold text-zinc-900">{item.id}</h4>
          <p className="mt-2 text-sm text-zinc-600">
            {item.objektDisplayId} · {item.objektName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusPill tone="teal">{item.objektDisplayId}</StatusPill>
          <StatusPill tone={statusTone(item.status)}>{item.status}</StatusPill>
          {item.status === "Archiviert" ? <StatusPill>Archivierter Vorgang</StatusPill> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <InfoRow label="Abrechnungs-ID" value={item.id} />
        <InfoRow label="Objekt" value={`${item.objektDisplayId} · ${item.objektName}`} />
        <InfoRow label="Zeitraum" value={formatZeitraum(item)} />
        <InfoRow label="Status" value={item.status} />
        <InfoRow label="Erstellt am" value={item.erstelltAm} />
        <InfoRow label="Geändert am" value={item.geaendertAm} />
        <InfoRow
          label="Positiv geprüft am"
          value={item.positivGeprueftAm ?? "Noch nicht positiv geprüft"}
        />
      </div>
    </section>
  );
}
