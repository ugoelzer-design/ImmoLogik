"use client";

import { RowActionButton } from "../shared/RowActionButton";
import { StatusPill } from "../shared/StatusPill";
import {
  formatZeitraum,
  statusTone,
} from "../../utils/nebenkosten-format";
import type {
  AbrechnungAktion,
  NebenkostenAbrechnung,
} from "@/types/nebenkosten";

export function AbrechnungRow({
  item,
  onAction,
  canPositivPruefen,
}: {
  item: NebenkostenAbrechnung;
  onAction: (item: NebenkostenAbrechnung, action: AbrechnungAktion) => void;
  canPositivPruefen: boolean;
}) {
  const isArchived = item.status === "Archiviert";
  const isPositivPruefenDisabled = isArchived || !canPositivPruefen;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_220px_220px_280px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill>{item.id}</StatusPill>
            <StatusPill tone="teal">{item.objektDisplayId}</StatusPill>
            <StatusPill tone={statusTone(item.status)}>{item.status}</StatusPill>
            {item.positivGeprueftAm ? <StatusPill>Positiv geprüft</StatusPill> : null}
            {!isArchived && !canPositivPruefen ? (
              <StatusPill tone="amber">Prüfung offen</StatusPill>
            ) : null}
          </div>

          <div>
            <h4 className="text-lg font-semibold text-zinc-900">{item.objektName}</h4>
            <p className="mt-1 text-sm text-zinc-600">{formatZeitraum(item)}</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Erstellt am</p>
          <p className="text-sm font-medium text-zinc-900">{item.erstelltAm}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Geändert am</p>
          <p className="text-sm font-medium text-zinc-900">{item.geaendertAm}</p>
        </div>

        <div className="flex flex-wrap items-start gap-2 xl:justify-end">
          <RowActionButton label="Öffnen" onClick={() => onAction(item, "Öffnen")} />
          <RowActionButton
            label="Bearbeiten"
            onClick={() => onAction(item, "Bearbeiten")}
            disabled={isArchived}
          />
          <RowActionButton
            label="Positiv geprüft"
            onClick={() => onAction(item, "Positiv geprüft")}
            disabled={isPositivPruefenDisabled}
          />
        </div>
      </div>
    </div>
  );
}
