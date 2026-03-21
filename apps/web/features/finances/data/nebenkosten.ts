import type {
  BeispielObjekt,
  FinanceSection,
  NebenkostenAbrechnung,
  NebenkostenTab,
} from "../types/nebenkosten";

export const financeSections: FinanceSection[] = [
  {
    id: "mietuebersicht",
    label: "Mietübersicht",
    description:
      "Soll-/Ist-Mieten, Rückstände und später vertragsbezogene Mietlogik.",
  },
  {
    id: "nebenkosten",
    label: "Nebenkosten",
    description:
      "Kostenarten, Umlage-Logik und später Zähler innerhalb dieses Bereichs.",
  },
  {
    id: "bankkonto",
    label: "Bankkonto",
    description: "Kontobewegungen, Zuordnung und später Bankbezug.",
  },
];

export const nebenkostenTabs: NebenkostenTab[] = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "abrechnungen", label: "Abrechnungen" },
];

export const beispielAbrechnungen: NebenkostenAbrechnung[] = [
  {
    id: "BKA-2026-001",
    objektDisplayId: "WEG-001",
    objektName: "Haus Hafencity",
    zeitraumVon: "2026-01-01",
    zeitraumBis: "2026-03-31",
    status: "In Arbeit",
    erstelltAm: "10.03.2026",
    geaendertAm: "10.03.2026",
  },
  {
    id: "BKA-2025-002",
    objektDisplayId: "WEG-002",
    objektName: "Haus Mainufer",
    zeitraumVon: "2025-01-01",
    zeitraumBis: "2025-12-31",
    status: "Archiviert",
    erstelltAm: "07.03.2026",
    geaendertAm: "11.03.2026",
    positivGeprueftAm: "11.03.2026",
  },
  {
    id: "BKA-2024-003",
    objektDisplayId: "WEG-003",
    objektName: "Hochhaus Rheinblick",
    zeitraumVon: "2024-01-01",
    zeitraumBis: "2024-12-31",
    status: "Archiviert",
    erstelltAm: "21.02.2025",
    geaendertAm: "28.02.2025",
    positivGeprueftAm: "28.02.2025",
  },
];

export const beispielObjekte: BeispielObjekt[] = [
  {
    displayId: "WEG-001",
    name: "Haus Hafencity",
    adresse: "Am Sandtorkai 12, 20457 Hamburg",
  },
  {
    displayId: "WEG-002",
    name: "Haus Mainufer",
    adresse: "Untermainkai 8, 60329 Frankfurt am Main",
  },
  {
    displayId: "WEG-003",
    name: "Hochhaus Rheinblick",
    adresse: "Rheinuferstraße 21, 50678 Köln",
  },
];
