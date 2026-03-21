"use client";

import { useEffect, useState } from "react";
import type { NebenkostenAbrechnung } from "@/types/nebenkosten";
import type { AbrechnungsPosition, Abrechnungseinheit } from "../utils/nebenkosten-calc";
import { isLegacyMockObjectValue } from "../utils/nebenkosten-calc";
import { NEBENKOSTEN_STORAGE_KEYS, readStorageValue, writeStorageValue } from "../utils/nebenkosten-storage";

export type FinalReportSnapshot = {
  abrechnungId: string;
  createdAt: string;
  positionen: AbrechnungsPosition[];
  einheiten: Abrechnungseinheit[];
};

type PositionenRecord = Record<string, AbrechnungsPosition[]>;
type EinheitenRecord = Record<string, Abrechnungseinheit[]>;
type FinalReportsRecord = Record<string, FinalReportSnapshot>;

export function useNebenkostenStorage() {
  const [abrechnungen, setAbrechnungen] = useState<NebenkostenAbrechnung[]>([]);
  const [positionsByAbrechnungId, setPositionsByAbrechnungId] = useState<PositionenRecord>({});
  const [einheitenByAbrechnungId, setEinheitenByAbrechnungId] = useState<EinheitenRecord>({});
  const [finalReportSnapshotsByAbrechnungId, setFinalReportSnapshotsByAbrechnungId] = useState<FinalReportsRecord>({});
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const a = readStorageValue<NebenkostenAbrechnung[] | null>(NEBENKOSTEN_STORAGE_KEYS.abrechnungen, null);
    const p = readStorageValue<PositionenRecord | null>(NEBENKOSTEN_STORAGE_KEYS.positionen, null);
    const e = readStorageValue<EinheitenRecord | null>(NEBENKOSTEN_STORAGE_KEYS.einheiten, null);
    const f = readStorageValue<FinalReportsRecord | null>(NEBENKOSTEN_STORAGE_KEYS.finalReports, null);
    const bereinigt = Array.isArray(a) ? a.filter((item) => !isLegacyMockObjectValue(String(item.objektName ?? ""))) : [];
    setAbrechnungen(bereinigt);
    setPositionsByAbrechnungId(p && typeof p === "object" ? p : {});
    setEinheitenByAbrechnungId(e && typeof e === "object" ? e : {});
    setFinalReportSnapshotsByAbrechnungId(f && typeof f === "object" ? f : {});
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    writeStorageValue(NEBENKOSTEN_STORAGE_KEYS.abrechnungen, abrechnungen);
    writeStorageValue(NEBENKOSTEN_STORAGE_KEYS.positionen, positionsByAbrechnungId);
    writeStorageValue(NEBENKOSTEN_STORAGE_KEYS.einheiten, einheitenByAbrechnungId);
    writeStorageValue(NEBENKOSTEN_STORAGE_KEYS.finalReports, finalReportSnapshotsByAbrechnungId);
  }, [abrechnungen, einheitenByAbrechnungId, finalReportSnapshotsByAbrechnungId, hasLoaded, positionsByAbrechnungId]);

  return {
    abrechnungen, setAbrechnungen,
    positionsByAbrechnungId, setPositionsByAbrechnungId,
    einheitenByAbrechnungId, setEinheitenByAbrechnungId,
    finalReportSnapshotsByAbrechnungId, setFinalReportSnapshotsByAbrechnungId,
    hasLoadedNebenkostenStorage: hasLoaded,
  };
}
