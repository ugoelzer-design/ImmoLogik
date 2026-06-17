// localStorage-Helfer – isoliert und SSR-sicher

export const OBJECT_MODULE_STORAGE_KEYS = {
  apartments: "immologik.object-detail.apartments",
  tenancies:  "immologik.object-detail.tenancies",
  meters:     "immologik.object-detail.meters",
  utilities:  "immologik.object-detail.utilities",
} as const;

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

export function writeStorageRecord<T>(
  storageKey: string,
  value: Record<string, T[]>,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

import type { NebenkostenAbrechnung } from "@/types/nebenkosten";

export function isFinalReportFreigegeben(item: NebenkostenAbrechnung) {
  return item.status === "Archiviert" && Boolean(item.positivGeprueftAm);
}
