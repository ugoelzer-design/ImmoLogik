export type ImmoDocumentCategory =
  | "Mietvertrag"
  | "Nebenkosten"
  | "Protokoll"
  | "Rechnung"
  | "Sonstiges";

export type ImmoDocument = {
  id: string;
  title: string;
  objectName: string;
  category: ImmoDocumentCategory;
  status: "Vorhanden" | "Fehlt" | "In Prüfung";
  updatedAt: string;
};
