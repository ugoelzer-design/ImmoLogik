export type { Kostenart } from "@/features/shared/kostenarten";

export type FinanceSectionId = "mietuebersicht" | "nebenkosten" | "bankkonto";

export type NebenkostenTabId = "uebersicht" | "abrechnungen";

export type AbrechnungStatus = "In Arbeit" | "Archiviert";

export type AbrechnungAktion = "Oeffnen" | "Bearbeiten" | "Positiv geprueft";

export type StatusFilter = "AKTIV" | "ALLE" | "In Arbeit" | "Archiviert";

export type FinanceSection = {
  id: FinanceSectionId;
  label: string;
  description: string;
};

export type NebenkostenTab = {
  id: NebenkostenTabId;
  label: string;
};

export type NebenkostenAbrechnung = {
  id: string;
  objektDisplayId: string;
  objektName: string;
  zeitraumVon: string;
  zeitraumBis: string;
  status: AbrechnungStatus;
  erstelltAm: string;
  geaendertAm: string;
  positivGeprueftAm?: string;
};

export type BeispielObjekt = {
  displayId: string;
  name: string;
  adresse: string;
};

export type VorbereiteteAbrechnung = {
  objektDisplayId: string;
  objektName: string;
  zeitraumVon: string;
  zeitraumBis: string;
};
