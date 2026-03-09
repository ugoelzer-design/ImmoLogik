import type { ImmoDocument } from "@/types/document";

export const mockDocuments: ImmoDocument[] = [
  {
    id: "doc-1",
    title: "Mietvertrag Wohnung 2.OG",
    objectName: "Bergstraße 12",
    category: "Mietvertrag",
    status: "Vorhanden",
    updatedAt: "08.03.2026",
  },
  {
    id: "doc-2",
    title: "Nebenkosten 2025",
    objectName: "Rheinallee 5",
    category: "Nebenkosten",
    status: "In Prüfung",
    updatedAt: "07.03.2026",
  },
  {
    id: "doc-3",
    title: "Übergabeprotokoll Einheit A-03",
    objectName: "Hafenstraße 21",
    category: "Protokoll",
    status: "Vorhanden",
    updatedAt: "05.03.2026",
  },
  {
    id: "doc-4",
    title: "Heizkostenabrechnung",
    objectName: "Bergstraße 12",
    category: "Rechnung",
    status: "Fehlt",
    updatedAt: "01.03.2026",
  },
];
