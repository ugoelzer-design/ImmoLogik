// localStorage-Helfer – isoliert und SSR-sicher

export const OBJECT_MODULE_STORAGE_KEYS = {
  apartments: "immologik.object-detail.apartments",
  tenancies:  "immologik.object-detail.tenancies",
  utilities:  "immologik.object-detail.utilities",
} as const;

export const NEBENKOSTEN_STORAGE_KEYS = {
  abrechnungen: "immologik.nebenkosten.abrechnungen",
  positionen:   "immologik.nebenkosten.positionen",
  einheiten:    "immologik.nebenkosten.einheiten",
  finalReports: "immologik.nebenkosten.final-reports",
} as const;

export function readStorageValue<T>(storageKey: string, fallbackValue: T): T {
  if (typeof window === "undefined") return fallbackValue;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return fallbackValue;
  try { return JSON.parse(raw) as T; } catch { return fallbackValue; }
}

export function writeStorageValue<T>(storageKey: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function readStorageRecord<T>(storageKey: string): Record<string, T[]> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, T[]>;
  } catch { return {}; }
}

import type { NebenkostenAbrechnung } from "@/types/nebenkosten";

export function isFinalReportFreigegeben(item: NebenkostenAbrechnung) {
  return item.status === "Archiviert" && Boolean(item.positivGeprueftAm);
}
