export type FinanceSectionId = "mietuebersicht" | "nebenkosten" | "bankkonto";

export type FinanceSection = {
  id: FinanceSectionId;
  label: string;
  description: string;
};

export type NebenkostenTabId = "uebersicht" | "abrechnungen";

export type NebenkostenTab = {
  id: NebenkostenTabId;
  label: string;
};

export type AbrechnungStatus = "In Arbeit" | "Archiviert";
export type NebenkostenStatus = AbrechnungStatus;

export type NebenkostenAbrechnung = {
  id: string;
  objektDisplayId: string;
  objektName: string;
  zeitraumVon: string;
  zeitraumBis: string;
  status: NebenkostenStatus;
  erstelltAm: string;
  geaendertAm: string;
  positivGeprueftAm?: string;
};

export type BeispielObjekt = {
  displayId: string;
  name: string;
  adresse: string;
};
