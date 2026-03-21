import type {
  AbrechnungStatus,
  NebenkostenAbrechnung,
} from "../types/nebenkosten";

export function formatDateForDisplay(value: string) {
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export function formatZeitraum(
  item: Pick<NebenkostenAbrechnung, "zeitraumVon" | "zeitraumBis">,
) {
  return `${formatDateForDisplay(item.zeitraumVon)} - ${formatDateForDisplay(
    item.zeitraumBis,
  )}`;
}

export function currentDateForDisplay() {
  return new Date().toLocaleDateString("de-DE");
}

export function statusTone(status: AbrechnungStatus): "amber" | "neutral" {
  if (status === "In Arbeit") return "amber";
  return "neutral";
}
