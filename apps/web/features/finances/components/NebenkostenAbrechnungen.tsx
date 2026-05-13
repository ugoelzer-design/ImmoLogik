"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  areSerializedValuesEqual,
  createEinheitenFromObjektmodul,
  createObjectReferencesFromService,
  type LocalObjectReference,
  type ObjectModuleApartment,
  type ObjectModuleTenancy,
  type ObjectModuleUtility,
  createPositionenFromObjektmodul,
  distributeIntegerTotal,
  getObjectStorageKeyByDisplayId,
  getReadableObjectName,
  isLegacyMockObjectValue,
  isTechnicalObjectName,
  isTechnicalIdentifier,
  pickFirstStringField,
  pickPositiveNumberField,
  buildReadableAddress,
  normalizeDisplayId,
  normalizeLookupValue,
  parseDecimalString,
} from "../utils/nebenkosten-calc";
import {
  NEBENKOSTEN_STORAGE_KEYS,
  OBJECT_MODULE_STORAGE_KEYS,
  isFinalReportFreigegeben,
  readStorageRecord,
  readStorageValue,
} from "../utils/nebenkosten-storage";
import { beispielAbrechnungen } from "../data/nebenkosten";
import { kostenarten } from "../../shared/kostenarten";
import { BearbeitenAbrechnungDialog } from "./dialogs/BearbeitenAbrechnungDialog";
import { NeueAbrechnungDialog } from "./dialogs/NeueAbrechnungDialog";
import { StatusPill } from "./shared/StatusPill";
import { currentDateForDisplay } from "../utils/nebenkosten-format";
import { getObjects } from "../../objects/services/objects.service";
import {
  approveUtilityStatement,
  getUtilityStatementValidation,
  getUtilityStatementsWorkspace,
  listUtilityStatements,
  syncUtilityStatementsWorkspace,
} from "../services/utility-statements.service";
import type {
  UtilityStatementValidationResponse,
  UtilityStatementsWorkspaceSettlement,
} from "../services/utility-statements.service";
import {
  NebenkostenEinzelreportBatch,
  NebenkostenVermieterreportTemplate,
  formatGermanDate,
  type EinzelreportTemplateData,
  type VermieterreportTemplateData,
} from "./NebenkostenEinzelreportTemplate";
import type {
  AbrechnungAktion,
  NebenkostenAbrechnung,
  StatusFilter,
  VorbereiteteAbrechnung,
} from "@/types/nebenkosten";
import type { ImmoDocument } from "@/types/document";

function sanitizeForReportId(value: string) {
  const normalized = normalizeLookupValue(value)
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return encodeURIComponent(normalized);
}

function buildReportId(prefix: string, ...values: string[]) {
  const normalizedParts = values
    .map((value) => sanitizeForReportId(value))
    .filter((part) => part !== "");

  return `${prefix}-${normalizedParts.join("-")}`;
}

const PRINT_WINDOW_STYLE = `
body{font-family:Arial,sans-serif;padding:20mm;color:#111827;}
table{width:100%;border-collapse:collapse;}
td,th{padding:8px;border-bottom:1px solid #d1d5db;text-align:left;}
@media print{body{padding:10mm;}}
`;

function openPrintWindow(html: string, title: string) {
  const windowTitle = title?.replace(/"/g, "").trim() || "Nebenkostenabrechnung";
  const w = window.open("", "_blank", "width=900,height=700");

  if (!w) {
    return;
  }

  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${windowTitle}</title><style>${PRINT_WINDOW_STYLE}</style></head><body>${html}</body></html>`,
  );
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

function printElementBySelector(selector: string, title: string) {
  const target = document.querySelector(selector);

  if (!target) {
    return;
  }

  openPrintWindow(target.innerHTML, title);
}

function printReportById(reportId: string | undefined, title: string) {
  if (!reportId) {
    return;
  }

  printElementBySelector(`[data-report-id="${reportId}"]`, title);
}

function printOwnerReportById(reportId: string | undefined, title: string) {
  if (!reportId) {
    return;
  }

  printElementBySelector(`[data-owner-report-id="${reportId}"]`, title);
}

type PositionArt = "standard" | "optional" | "sonder";
type Verteilschluessel = "MEA" | "Fläche" | "Einheit" | "Direkt" | "Personen";
type Bewertungsstatus = "offen" | "erfasst" | "bewusst-0" | "nicht-relevant";

type AbrechnungsPosition = {
  id: string;
  bezeichnung: string;
  kostenart: string;
  betrag: number;
  umlagefaehig: boolean;
  verteilschluessel: Verteilschluessel;
  direkteEinheitId: string | null;
  erfasstAm: string;
  art: PositionArt;
  bewertungsstatus: Bewertungsstatus;
};

type SonderpositionForm = {
  bezeichnung: string;
  betrag: string;
  umlagefaehig: boolean;
  verteilschluessel: Verteilschluessel;
  direkteEinheitId: string;
};

type Abrechnungseinheit = {
  id: string;
  wegId: string;
  einheitId: string;
  reportLabel: string;
  einheit: string;
  eigentuemer: string;
  mieter: string;
  flaeche: number;
  mea: number;
  personen: number;
  vorauszahlung: number;
};

const verteilschluesselOptionen: Verteilschluessel[] = [
  "MEA",
  "Fläche",
  "Einheit",
  "Personen",
  "Direkt",
];

const bewertungsstatusOptionen: Array<{ value: Bewertungsstatus; label: string }> = [
  { value: "offen", label: "Offen" },
  { value: "erfasst", label: "Erfasst" },
  { value: "bewusst-0", label: "Bewusst 0" },
  { value: "nicht-relevant", label: "Nicht relevant" },
];

const PRUEF_TOLERANZ = 0.01;

type ObjektkostenstelleQuelle = {
  id: string;
  name: string;
  umlagefaehig: boolean;
  verteilschluessel: Verteilschluessel;
  art: Exclude<PositionArt, "sonder">;
};




const objektkostenstellenByObjektDisplayId: Record<string, ObjektkostenstelleQuelle[]> = {
  "WEG-001": [
    {
      id: "weg-001-allgemeinstrom",
      name: "Allgemeinstrom",
      umlagefaehig: true,
      verteilschluessel: "Personen",
      art: "standard",
    },
    {
      id: "weg-001-verwalterkosten",
      name: "Verwalterkosten",
      umlagefaehig: false,
      verteilschluessel: "MEA",
      art: "standard",
    },
    {
      id: "weg-001-gebaeudeversicherung",
      name: "Gebäudeversicherung",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "standard",
    },
    {
      id: "weg-001-hausmeister",
      name: "Hausmeister",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "standard",
    },
    {
      id: "weg-001-gartenpflege",
      name: "Gartenpflege",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "standard",
    },
    {
      id: "weg-001-beleuchtung",
      name: "Beleuchtung Außenanlagen",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "optional",
    },
    {
      id: "weg-001-kabel",
      name: "Gemeinschaftsantenne / Kabel",
      umlagefaehig: true,
      verteilschluessel: "Einheit",
      art: "optional",
    },
    {
      id: "weg-001-haftpflicht",
      name: "Haftpflichtversicherung",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "optional",
    },
  ],
  "WEG-002": [
    {
      id: "weg-002-allgemeinstrom",
      name: "Allgemeinstrom",
      umlagefaehig: true,
      verteilschluessel: "Personen",
      art: "standard",
    },
    {
      id: "weg-002-gebaeudeversicherung",
      name: "Gebäudeversicherung",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "standard",
    },
    {
      id: "weg-002-wasserversorgung",
      name: "Wasserversorgung",
      umlagefaehig: true,
      verteilschluessel: "Personen",
      art: "standard",
    },
    {
      id: "weg-002-abwasser",
      name: "Abwasser",
      umlagefaehig: true,
      verteilschluessel: "Personen",
      art: "standard",
    },
    {
      id: "weg-002-muell",
      name: "Müllabfuhr",
      umlagefaehig: true,
      verteilschluessel: "Personen",
      art: "standard",
    },
    {
      id: "weg-002-treppenhaus",
      name: "Treppenhausreinigung",
      umlagefaehig: true,
      verteilschluessel: "Einheit",
      art: "optional",
    },
    {
      id: "weg-002-gartenpflege",
      name: "Gartenpflege",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "optional",
    },
  ],
  "WEG-003": [
    {
      id: "weg-003-allgemeinstrom",
      name: "Allgemeinstrom",
      umlagefaehig: true,
      verteilschluessel: "Personen",
      art: "standard",
    },
    {
      id: "weg-003-gebaeudeversicherung",
      name: "Gebäudeversicherung",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "standard",
    },
    {
      id: "weg-003-hausmeister",
      name: "Hausmeister",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "standard",
    },
    {
      id: "weg-003-aufzug",
      name: "Aufzug",
      umlagefaehig: true,
      verteilschluessel: "Einheit",
      art: "optional",
    },
    {
      id: "weg-003-winterdienst",
      name: "Winterdienst",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "optional",
    },
    {
      id: "weg-003-treppenhaus",
      name: "Treppenhausreinigung",
      umlagefaehig: true,
      verteilschluessel: "Einheit",
      art: "optional",
    },
  ],
  DEFAULT: [
    {
      id: "default-allgemeinstrom",
      name: "Allgemeinstrom",
      umlagefaehig: true,
      verteilschluessel: "Personen",
      art: "standard",
    },
    {
      id: "default-gebaeudeversicherung",
      name: "Gebäudeversicherung",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "standard",
    },
    {
      id: "default-hausmeister",
      name: "Hausmeister",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "standard",
    },
    {
      id: "default-gartenpflege",
      name: "Gartenpflege",
      umlagefaehig: true,
      verteilschluessel: "MEA",
      art: "optional",
    },
  ],
};

const initialBetragOverridesByAbrechnungId: Record<string, Record<string, number>> = {
  "BKA-2026-001": {
    Allgemeinstrom: 180.5,
    Verwalterkosten: 95,
  },
  "BKA-2025-002": {
    Gebäudeversicherung: 820,
  },
  "BKA-2024-003": {
    Heizungswartung: 240,
  },
};

const initialSonderpositionenByAbrechnungId: Record<string, AbrechnungsPosition[]> = {
  "BKA-2026-001": [],
  "BKA-2025-002": [],
  "BKA-2024-003": [],
};

const beispielEinheitenVorlage = [
  {
    key: "E01",
    wegId: "WEG-001",
    einheitId: "WEG-001-WE-EG-L",
    reportLabel: "69207 Sandhausen, Lattweg 39-41, EG links",
    einheit: "WE 01",
    eigentuemer: "Eigentümer 01",
    mieter: "Mieter 01",
    flaeche: 98,
    mea: 400,
    personen: 3,
    vorauszahlung: 2450,
  },
  {
    key: "E02",
    wegId: "WEG-001",
    einheitId: "WEG-001-WE-EG-R",
    reportLabel: "69207 Sandhausen, Lattweg 39-41, EG rechts",
    einheit: "WE 02",
    eigentuemer: "Eigentümer 02",
    mieter: "Mieter 02",
    flaeche: 82,
    mea: 330,
    personen: 2,
    vorauszahlung: 2125,
  },
  {
    key: "E03",
    wegId: "WEG-001",
    einheitId: "WEG-001-WE-1OG",
    reportLabel: "69207 Sandhausen, Lattweg 39-41, 1. OG",
    einheit: "WE 03",
    eigentuemer: "Eigentümer 03",
    mieter: "Leerstand / Selbstnutzer",
    flaeche: 67,
    mea: 270,
    personen: 1,
    vorauszahlung: 0,
  },
];

function createInitialEinheitenForAbrechnung(
  abrechnungId: string,
): Abrechnungseinheit[] {
  return beispielEinheitenVorlage.map((item) => ({
    id: `${abrechnungId}__${item.key}`,
    wegId: item.wegId,
    einheitId: item.einheitId,
    reportLabel: item.reportLabel,
    einheit: item.einheit,
    eigentuemer: item.eigentuemer,
    mieter: item.mieter,
    flaeche: item.flaeche,
    mea: item.mea,
    personen: item.personen,
    vorauszahlung: item.vorauszahlung,
  }));
}

function createEmptySonderpositionForm(): SonderpositionForm {
  return {
    bezeichnung: "",
    betrag: "",
    umlagefaehig: true,
    verteilschluessel: "Direkt",
    direkteEinheitId: "",
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100);
}

function fromCents(value: number) {
  return value / 100;
}

function distributeAmountInCents(
  totalAmount: number,
  weightedEntries: Array<{ id: string; weight: number }>,
) {
  const totalCents = toCents(totalAmount);
  const verteilung: Record<string, number> = {};

  weightedEntries.forEach((entry) => {
    verteilung[entry.id] = 0;
  });

  const gueltigeEintraege = weightedEntries.filter((entry) => entry.weight > 0);

  if (totalCents <= 0 || gueltigeEintraege.length === 0) {
    return verteilung;
  }

  const summeGewichte = gueltigeEintraege.reduce((sum, entry) => sum + entry.weight, 0);

  if (summeGewichte <= 0) {
    return verteilung;
  }

  const anteile = gueltigeEintraege.map((entry) => {
    const anteilInCent = (totalCents * entry.weight) / summeGewichte;
    const basisCents = Math.floor(anteilInCent);

    return {
      id: entry.id,
      basisCents,
      rest: anteilInCent - basisCents,
    };
  });

  let verbleibendeCents =
    totalCents - anteile.reduce((sum, entry) => sum + entry.basisCents, 0);

  anteile
    .sort((left, right) => right.rest - left.rest)
    .forEach((entry) => {
      const zusatz = verbleibendeCents > 0 ? 1 : 0;
      verteilung[entry.id] = entry.basisCents + zusatz;
      if (verbleibendeCents > 0) {
        verbleibendeCents -= 1;
      }
    });

  return verteilung;
}

function formatNumberForInput(value: number) {
  if (value === 0) return "";
  return String(value).replace(".", ",");
}

function mapStandardSchluesselToKurzform(value?: string | null): Verteilschluessel {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized.includes("mea")) return "MEA";
  if (normalized.includes("fläche")) return "Fläche";
  if (normalized.includes("flaeche")) return "Fläche";
  if (normalized.includes("wohnfläche")) return "Fläche";
  if (normalized.includes("wohnflaeche")) return "Fläche";
  if (normalized.includes("einheit")) return "Einheit";
  if (normalized.includes("wohnung")) return "Einheit";
  if (normalized.includes("personen")) return "Personen";
  if (normalized.includes("person")) return "Personen";

  return "Direkt";
}

function isPositionAktiv(item: AbrechnungsPosition) {
  return item.betrag > 0;
}

function getErfassungsStatus(item: AbrechnungsPosition) {
  return isPositionAktiv(item) ? "Betrag erfasst" : "Nicht erfasst";
}

function getErfassungsStatusClassName(item: AbrechnungsPosition) {
  return isPositionAktiv(item)
    ? "bg-green-50 text-green-700"
    : "bg-red-50 text-red-700";
}

function getBewertungsstatusLabel(status: Bewertungsstatus) {
  if (status === "erfasst") return "Erfasst";
  if (status === "bewusst-0") return "Bewusst 0";
  if (status === "nicht-relevant") return "Nicht relevant";
  return "Offen";
}

type VerteilungEintrag = {
  id: string;
  einheit: string;
  eigentuemer: string;
  basis: string;
  anteil: number;
};

type VerteilungsZeile = {
  position: AbrechnungsPosition;
  verteilungJeEinheit: VerteilungEintrag[];
  verteilteSumme: number;
  offenerBetrag: number;
};

type Pruefpunkt = {
  id: string;
  label: string;
  istErfuellt: boolean;
  hinweis: string;
};

type Abschlusspruefung = {
  istVollstaendig: boolean;
  fehlendeAngaben: string[];
  pruefpunkte: Pruefpunkt[];
};

type ReportSummen = {
  summeGesamt: number;
  summeUmlagefaehig: number;
  summeNichtUmlagefaehig: number;
};

type ReportEinheitenSummen = {
  summeFlaeche: number;
  summeMea: number;
  summeVorauszahlung: number;
};

type ReportEinheitErgebnis = Abrechnungseinheit & {
  umlagefaehigAnteil: number;
  nichtUmlagefaehigAnteil: number;
  gesamtAnteil: number;
  mieterSaldo: number;
  mieterStatus: string;
};

type Deckungspruefung = {
  istErfuellt: boolean;
  summeAusgaben: number;
  summeVorauszahlungen: number;
  summeNachforderungen: number;
  summeGuthaben: number;
  deckungsdifferenz: number;
  hinweis: string;
};

type VorbereiteterReport = {
  item: NebenkostenAbrechnung;
  abschlusspruefung: Abschlusspruefung;
  summen: ReportSummen;
  einheitenSummen: ReportEinheitenSummen;
  verteilungAktiverPositionen: VerteilungsZeile[];
  abrechnungsergebnisJeEinheit: ReportEinheitErgebnis[];
  metadaten: {
    aktivePositionenCount: number;
    einheitenCount: number;
    problemCount: number;
    reportFreigabefaehig: boolean;
    reportFreigegeben: boolean;
  };
};

type NebenkostenAbrechnungenProps = {
  documents: ImmoDocument[];
};

type FinalReportSnapshot = {
  freigegebenAm: string;
  report: VorbereiteterReport;
};

type EinzelreportPosition = {
  id: string;
  bezeichnung: string;
  gesamtbetrag: number;
  schluessel: string;
  verteilung: string;
  anteil: number;
  umlagefaehig: boolean;
};

function createEinzelreportPositionen(
  report: VorbereiteterReport,
  einheitId: string,
): EinzelreportPosition[] {
  return report.verteilungAktiverPositionen.reduce<EinzelreportPosition[]>((positions, row) => {
      const verteilungseintrag = row.verteilungJeEinheit.find((entry) => entry.id === einheitId);

      if (!verteilungseintrag) {
        return positions;
      }

      positions.push({
        id: `${row.position.id}__${einheitId}`,
        bezeichnung: row.position.bezeichnung,
        gesamtbetrag: row.position.betrag,
        schluessel: row.position.verteilschluessel,
        verteilung: verteilungseintrag.basis,
        anteil: roundToCents(verteilungseintrag.anteil),
        umlagefaehig: row.position.umlagefaehig,
      });

      return positions;
    }, []);
}

function createEinzelreportEmpfaenger(einheit: ReportEinheitErgebnis) {
  const eigentuemer = String(einheit.eigentuemer ?? '').trim();

  if (eigentuemer !== '' && eigentuemer.toLowerCase() !== 'eigentümer offen') {
    return eigentuemer;
  }

  const mieter = String(einheit.mieter ?? '').trim();

  if (mieter !== '' && mieter.toLowerCase() !== 'leerstand / selbstnutzer') {
    return mieter;
  }

  return 'Empfänger offen';
}

function createEinzelreportAnrede(einheit: ReportEinheitErgebnis) {
  const empfaenger = createEinzelreportEmpfaenger(einheit);

  return empfaenger === 'Empfänger offen'
    ? 'Sehr geehrte Damen und Herren,'
    : `Sehr geehrte/r ${empfaenger},`;
}

function createEinzelreportErgebnisart(status: string): EinzelreportTemplateData["ergebnisart"] {
  const normalized = String(status).toLowerCase();

  if (normalized.includes("guthaben")) {
    return "Guthaben";
  }

  if (normalized.includes("nachzahlung")) {
    return "Nachzahlung";
  }

  return "Ausgeglichen";
}

function createEinzelreportTemplateData(
  report: VorbereiteterReport,
): EinzelreportTemplateData[] {
  const abrechnungszeitraumVon = formatGermanDate(report.item.zeitraumVon);
  const abrechnungszeitraumBis = formatGermanDate(report.item.zeitraumBis);

  return [...report.abrechnungsergebnisJeEinheit]
    .sort((left, right) =>
      left.einheit.localeCompare(right.einheit, "de", {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .map((einheit, index) => {
      const reportId = buildReportId(
        "einzel",
        report.item.objektName,
        einheit.einheit,
        String(index),
      );
      const empfaenger = createEinzelreportEmpfaenger(einheit);
      const anrede = createEinzelreportAnrede(einheit);
      const positionen = createEinzelreportPositionen(report, einheit.id).map((position) => ({
        kostenart: position.bezeichnung,
        umlagefaehigLabel: position.umlagefaehig ? "umlagefähig" : "nicht umlagefähig",
        gesamtbetrag: formatCurrency(position.gesamtbetrag),
        verteilerschluessel: position.schluessel,
        verteilung: position.verteilung,
        anteil: formatCurrency(position.anteil),
      }));

      return {
        objektName: report.item.objektName,
        einheitName: einheit.einheit,
        empfaengerName: empfaenger,
        abrechnungszeitraumVon,
        abrechnungszeitraumBis,
        anrede,
        betreff: `Nebenkostenabrechnung ${abrechnungszeitraumVon} bis ${abrechnungszeitraumBis}`,
        vorauszahlungen: formatCurrency(einheit.vorauszahlung),
        gesamtkostenanteil: formatCurrency(einheit.gesamtAnteil),
        ergebnisbetrag: formatCurrency(Math.abs(einheit.mieterSaldo)),
        ergebnisart: createEinzelreportErgebnisart(einheit.mieterStatus),
        positionen,
        verbrauchshistorie: [
          {
            jahr: String(new Date(report.item.zeitraumBis).getFullYear() - 2),
            heizung: `${Math.max(0, Math.round(einheit.flaeche * 1.6))} kWh/m²`,
            wasser: `${Math.max(0, einheit.personen * 34)} m³`,
            strom: `${Math.max(0, einheit.personen * 780)} kWh`,
            bemerkung: "Vergleichswert Vorjahr 2",
          },
          {
            jahr: String(new Date(report.item.zeitraumBis).getFullYear() - 1),
            heizung: `${Math.max(0, Math.round(einheit.flaeche * 1.5))} kWh/m²`,
            wasser: `${Math.max(0, einheit.personen * 32)} m³`,
            strom: `${Math.max(0, einheit.personen * 760)} kWh`,
            bemerkung: "Vergleichswert Vorjahr 1",
          },
          {
            jahr: String(new Date(report.item.zeitraumBis).getFullYear()),
            heizung: `${Math.max(0, Math.round(einheit.flaeche * 1.35))} kWh/m²`,
            wasser: `${Math.max(0, einheit.personen * 30)} m³`,
            strom: `${Math.max(0, einheit.personen * 720)} kWh`,
            bemerkung: "Aktueller Abrechnungszeitraum",
          },
        ],
        berichtsdatum: formatGermanDate(new Date()),
        absenderName: report.item.objektName,
        reportId,
      } satisfies EinzelreportTemplateData;
    });
}

function createVermieterreportTemplateData(
  report: VorbereiteterReport,
): VermieterreportTemplateData[] {
  const gruppiert = new Map<string, ReportEinheitErgebnis[]>();

  report.abrechnungsergebnisJeEinheit.forEach((einheit) => {
    const key = String(einheit.eigentuemer ?? "Eigentümer offen").trim() || "Eigentümer offen";
    const current = gruppiert.get(key) ?? [];
    current.push(einheit);
    gruppiert.set(key, current);
  });

  return Array.from(gruppiert.entries()).map(([eigentuemerName, einheiten]) => {
    const summeNichtUmlagefaehig = einheiten.reduce((sum, entry) => sum + entry.nichtUmlagefaehigAnteil, 0);
    const summeVorauszahlung = einheiten.reduce((sum, entry) => sum + entry.vorauszahlung, 0);
    const summeSaldo = einheiten.reduce((sum, entry) => sum + entry.mieterSaldo, 0);
    const reportId = buildReportId("vermieter", report.item.objektName, eigentuemerName);

    return {
      objektName: report.item.objektName,
      eigentuemerName,
      abrechnungszeitraumVon: formatGermanDate(report.item.zeitraumVon),
      abrechnungszeitraumBis: formatGermanDate(report.item.zeitraumBis),
      berichtsdatum: formatGermanDate(new Date()),
      kostenpositionen: [
        {
          label: "Nicht umlagefähige Eigentümerkosten",
          betrag: formatCurrency(summeNichtUmlagefaehig),
          hinweis: "Kostenanteile, die nicht an Mieter weitergegeben werden.",
        },
        {
          label: "Vorauszahlungen Ihrer Mieter",
          betrag: formatCurrency(summeVorauszahlung),
        },
        {
          label: "Saldo aus Vor-/Nachzahlungen",
          betrag: formatCurrency(Math.abs(summeSaldo)),
          hinweis: summeSaldo >= 0 ? "Nachzahlungen aus Mieterabrechnungen" : "Guthaben aus Mieterabrechnungen",
        },
      ],
      reportId,
      mieterUebersicht: einheiten.map((einheit) => ({
        einheit: einheit.einheit,
        mieter: einheit.mieter,
        vorauszahlung: formatCurrency(einheit.vorauszahlung),
        umlagefaehigerAnteil: formatCurrency(einheit.umlagefaehigAnteil),
        mieterSaldo: formatCurrency(Math.abs(einheit.mieterSaldo)),
        status: einheit.mieterStatus,
      })),
    };
  });
}

function getReportYearFromAbrechnung(item: NebenkostenAbrechnung) {
  const parsedYear = new Date(item.zeitraumBis).getFullYear();
  return Number.isNaN(parsedYear) ? null : parsedYear;
}

function buildNebenkostenDocumentsHref(
  item: NebenkostenAbrechnung,
  category: "Nebenkostenabrechnung" | "Jahresreport WEG",
) {
  const params = new URLSearchParams({
    search: item.objektDisplayId,
    category,
  });

  const reportYear = getReportYearFromAbrechnung(item);
  if (reportYear) {
    params.set("reportYear", String(reportYear));
  }

  return `/dokumente?${params.toString()}`;
}

function FinalerEinzelreportVersandblock({
  report,
  freigegebenAm,
}: {
  report: VorbereiteterReport;
  freigegebenAm: string;
}) {
  const einzelreports = [...report.abrechnungsergebnisJeEinheit].sort((left, right) =>
    left.einheit.localeCompare(right.einheit, 'de', {
      numeric: true,
      sensitivity: 'base',
    }),
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Versandpaket</p>
        <h5 className="mt-2 text-lg font-semibold text-zinc-900">
          Einzelreports pro Wohnung / Einheit
        </h5>
        <p className="mt-2 text-sm text-zinc-600">
          Die finale Ausgabe ist für den Mailversand aufgebaut und erzeugt pro Einheit einen separaten Report mit Anschreibenkopf.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill tone="dark">{einzelreports.length} Einzelreports</StatusPill>
          <StatusPill>Freigegeben am {freigegebenAm}</StatusPill>
        </div>
      </div>

      {einzelreports.map((einheit, index) => {
        const positionszeilen = createEinzelreportPositionen(report, einheit.id);
        const empfaenger = createEinzelreportEmpfaenger(einheit);
        const anrede = createEinzelreportAnrede(einheit);

        return (
          <article
            key={einheit.id}
            className="rounded-3xl border border-zinc-200 bg-white shadow-sm print:shadow-none"
            style={index > 0 ? { breakBefore: 'page', pageBreakBefore: 'always' } : undefined}
          >
            <div className="border-b border-zinc-200 px-8 py-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Anschreiben / Mailversand
                  </p>
                  <h6 className="mt-3 text-2xl font-semibold text-zinc-900">
                    Nebenkostenabrechnung {einheit.einheit}
                  </h6>
                  <p className="mt-2 text-sm text-zinc-600">{report.item.objektName}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Abrechnungszeitraum {report.item.zeitraumVon} bis {report.item.zeitraumBis}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-700">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Empfänger</p>
                  <p className="mt-2 font-medium text-zinc-900">{empfaenger}</p>
                  <p className="mt-1">Einheit {einheit.einheit}</p>
                  <p className="mt-1">{einheit.reportLabel}</p>
                  <p className="mt-3 text-[11px] uppercase tracking-wide text-zinc-500">Freigabe</p>
                  <p className="mt-1">{freigegebenAm}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Betreff</p>
                <p className="mt-2 text-base font-semibold text-zinc-900">
                  Betriebskostenabrechnung {report.item.zeitraumVon} bis {report.item.zeitraumBis}
                </p>
                <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-700">
                  <p>{anrede}</p>
                  <p>
                    für die Einheit {einheit.reportLabel} erhalten Sie hier die Betriebskostenabrechnung für den Zeitraum {report.item.zeitraumVon} bis {report.item.zeitraumBis}.
                  </p>
                  <p>
                    Die umlagefähigen Kosten wurden auf Grundlage der hinterlegten Verteilerschlüssel berechnet und mit den im Abrechnungszeitraum erfassten Vorauszahlungen verrechnet.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-8 py-8">
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Ihre Gesamtkosten</p>
                  <p className="mt-3 text-3xl font-semibold text-zinc-900">
                    {formatCurrency(einheit.gesamtAnteil)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">Umlagefähiger und nicht umlagefähiger Anteil</p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Ihre Vorauszahlungen</p>
                  <p className="mt-3 text-3xl font-semibold text-zinc-900">
                    {formatCurrency(einheit.vorauszahlung)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">Im Abrechnungszeitraum berücksichtigt</p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Ihr Ergebnis</p>
                  <p className="mt-3 text-3xl font-semibold text-zinc-900">
                    {formatCurrency(Math.abs(einheit.mieterSaldo))}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">{einheit.mieterStatus}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Wohnfläche</p>
                  <p className="mt-3 text-3xl font-semibold text-zinc-900">{formatNumberForInput(einheit.flaeche)} m²</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">MEA</p>
                  <p className="mt-3 text-3xl font-semibold text-zinc-900">{formatNumberForInput(einheit.mea)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Mieter</p>
                  <p className="mt-3 text-2xl font-semibold text-zinc-900">{einheit.mieter}</p>
                  <p className="mt-2 text-sm text-zinc-600">Eigentümer: {einheit.eigentuemer}</p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200">
                <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Kostenaufstellung</p>
                  <h6 className="mt-2 text-lg font-semibold text-zinc-900">Ihr Einzelreport</h6>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 text-left text-sm text-zinc-700">
                    <thead className="bg-white text-[11px] uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-5 py-3 font-medium">Kostenart</th>
                        <th className="px-5 py-3 font-medium">Gesamt</th>
                        <th className="px-5 py-3 font-medium">Schlüssel</th>
                        <th className="px-5 py-3 font-medium">Verteilung</th>
                        <th className="px-5 py-3 font-medium text-right">Ihr Anteil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white">
                      {positionszeilen.map((row) => (
                        <tr key={row.id}>
                          <td className="px-5 py-4 align-top">
                            <p className="font-medium text-zinc-900">{row.bezeichnung}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {row.umlagefaehig ? 'umlagefähig' : 'nicht umlagefähig'}
                            </p>
                          </td>
                          <td className="px-5 py-4 align-top">{formatCurrency(row.gesamtbetrag)}</td>
                          <td className="px-5 py-4 align-top">{row.schluessel}</td>
                          <td className="px-5 py-4 align-top">{row.verteilung}</td>
                          <td className="px-5 py-4 text-right align-top font-medium text-zinc-900">
                            {formatCurrency(row.anteil)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function createVerteilungAktiverPositionen(
  positionen: AbrechnungsPosition[],
  einheiten: Abrechnungseinheit[],
): VerteilungsZeile[] {
  const aktivePositionen = positionen.filter((item) => isPositionAktiv(item));
  const gesamtMea = einheiten.reduce((sum, item) => sum + item.mea, 0);
  const gesamtFlaeche = einheiten.reduce((sum, item) => sum + item.flaeche, 0);
  const gesamtPersonen = einheiten.reduce((sum, item) => sum + item.personen, 0);
  const bekannteEinheitenIds = new Set(einheiten.map((item) => item.id));

  return aktivePositionen
    .map((position) => {
      let basisByEinheitId: Record<string, string> = {};
      let anteileInCentByEinheitId: Record<string, number> = {};

      if (position.verteilschluessel === "MEA") {
        basisByEinheitId = Object.fromEntries(
          einheiten.map((einheit) => [
            einheit.id,
            `${einheit.mea} / ${gesamtMea} MEA`,
          ]),
        );
        anteileInCentByEinheitId = distributeAmountInCents(
          position.betrag,
          einheiten.map((einheit) => ({
            id: einheit.id,
            weight: einheit.mea,
          })),
        );
      }

      if (position.verteilschluessel === "Fläche") {
        basisByEinheitId = Object.fromEntries(
          einheiten.map((einheit) => [
            einheit.id,
            `${einheit.flaeche.toFixed(2)} / ${gesamtFlaeche.toFixed(2)} m²`,
          ]),
        );
        anteileInCentByEinheitId = distributeAmountInCents(
          position.betrag,
          einheiten.map((einheit) => ({
            id: einheit.id,
            weight: einheit.flaeche,
          })),
        );
      }

      if (position.verteilschluessel === "Einheit") {
        basisByEinheitId = Object.fromEntries(
          einheiten.map((einheit) => [
            einheit.id,
            `1 / ${einheiten.length} Einheit`,
          ]),
        );
        anteileInCentByEinheitId = distributeAmountInCents(
          position.betrag,
          einheiten.map((einheit) => ({
            id: einheit.id,
            weight: 1,
          })),
        );
      }

      if (position.verteilschluessel === "Personen") {
        basisByEinheitId = Object.fromEntries(
          einheiten.map((einheit) => [
            einheit.id,
            `${einheit.personen} / ${gesamtPersonen} Personen`,
          ]),
        );
        anteileInCentByEinheitId = distributeAmountInCents(
          position.betrag,
          einheiten.map((einheit) => ({
            id: einheit.id,
            weight: einheit.personen,
          })),
        );
      }

      if (position.verteilschluessel === "Direkt") {
        basisByEinheitId = Object.fromEntries(
          einheiten.map((einheit) => {
            if (!position.direkteEinheitId) {
              return [einheit.id, "Direkte Zuordnung fehlt"];
            }

            if (!bekannteEinheitenIds.has(position.direkteEinheitId)) {
              return [einheit.id, "Direkte Einheit nicht gefunden"];
            }

            if (position.direkteEinheitId === einheit.id) {
              return [einheit.id, `Direkt auf ${einheit.einheit}`];
            }

            return [einheit.id, "Direkt auf andere Einheit"];
          }),
        );

        anteileInCentByEinheitId = Object.fromEntries(
          einheiten.map((einheit) => {
            const anteilInCent =
              position.direkteEinheitId === einheit.id &&
              bekannteEinheitenIds.has(einheit.id)
                ? toCents(position.betrag)
                : 0;
            return [einheit.id, anteilInCent];
          }),
        );
      }

      const verteilungJeEinheit = einheiten.map((einheit) => ({
        id: einheit.id,
        einheit: einheit.einheit,
        eigentuemer: einheit.eigentuemer,
        basis: basisByEinheitId[einheit.id] ?? "",
        anteil: fromCents(anteileInCentByEinheitId[einheit.id] ?? 0),
      }));

      const verteilteSumme = roundToCents(
        verteilungJeEinheit.reduce((sum, item) => sum + item.anteil, 0),
      );
      const offenerBetragRaw = roundToCents(position.betrag - verteilteSumme);

      return {
        position,
        verteilungJeEinheit,
        verteilteSumme,
        offenerBetrag:
          Math.abs(offenerBetragRaw) <= PRUEF_TOLERANZ ? 0 : offenerBetragRaw,
      };
    })
    .sort((left, right) =>
      left.position.kostenart.localeCompare(right.position.kostenart, "de"),
    );
}

function getPruefpunktEinheitLabel(einheit: Abrechnungseinheit) {
  const reportLabel = String(einheit.reportLabel ?? "").trim();

  if (reportLabel !== "") {
    return reportLabel;
  }

  const einheitLabel = String(einheit.einheit ?? "").trim();

  if (einheitLabel !== "") {
    return einheitLabel;
  }

  const einheitId = String(einheit.einheitId ?? "").trim();

  if (einheitId !== "") {
    return einheitId;
  }

  return "Einheit ohne Bezeichnung";
}

function createWegEinheitenPruefpunkt(
  einheiten: Abrechnungseinheit[],
  wegSollEinheiten: Abrechnungseinheit[],
): Pruefpunkt {
  const aktiveWegSollEinheiten = wegSollEinheiten.filter(
    (item) => normalizeLookupValue(item.einheitId) !== "",
  );

  if (aktiveWegSollEinheiten.length === 0) {
    return {
      id: "weg-einheiten",
      label: "Alle WEG-Einheiten einbezogen",
      istErfuellt: false,
      hinweis:
        "Für die gewählte WEG konnten keine aktiven Einheiten aus dem Objektmodul geladen werden.",
    };
  }

  const sollByEinheitId = new Map<string, Abrechnungseinheit>();

  aktiveWegSollEinheiten.forEach((item) => {
    const normalizedEinheitId = normalizeLookupValue(item.einheitId);

    if (normalizedEinheitId !== "" && !sollByEinheitId.has(normalizedEinheitId)) {
      sollByEinheitId.set(normalizedEinheitId, item);
    }
  });

  const istOhneStabileEinheitId = einheiten.filter(
    (item) => normalizeLookupValue(item.einheitId) === "",
  );

  const istByEinheitId = new Map<string, Abrechnungseinheit[]>();

  einheiten.forEach((item) => {
    const normalizedEinheitId = normalizeLookupValue(item.einheitId);

    if (normalizedEinheitId === "") {
      return;
    }

    const current = istByEinheitId.get(normalizedEinheitId) ?? [];
    current.push(item);
    istByEinheitId.set(normalizedEinheitId, current);
  });

  const fehlendeEinheiten = Array.from(sollByEinheitId.entries())
    .filter(([einheitId]) => !istByEinheitId.has(einheitId))
    .map(([, item]) => item);

  const doppelteEinheiten = Array.from(istByEinheitId.entries())
    .filter(([, items]) => items.length > 1)
    .map(([, items]) => items[0]);

  const fremdeEinheiten = Array.from(istByEinheitId.entries())
    .filter(([einheitId]) => !sollByEinheitId.has(einheitId))
    .map(([, items]) => items[0]);

  const istErfuellt =
    istOhneStabileEinheitId.length === 0 &&
    fehlendeEinheiten.length === 0 &&
    doppelteEinheiten.length === 0 &&
    fremdeEinheiten.length === 0;

  let hinweis = "";

  if (istOhneStabileEinheitId.length > 0) {
    hinweis = `Bei ${istOhneStabileEinheitId.length} Abrechnungseinheiten fehlt die stabile Einheit-ID.`;
  } else if (fehlendeEinheiten.length > 0) {
    hinweis = `Es fehlen ${fehlendeEinheiten.length} von ${aktiveWegSollEinheiten.length} aktiven WEG-Einheiten: ${fehlendeEinheiten
      .slice(0, 6)
      .map((item) => getPruefpunktEinheitLabel(item))
      .join(", ")}${fehlendeEinheiten.length > 6 ? " ..." : ""}.`;
  } else if (doppelteEinheiten.length > 0) {
    hinweis = `Mindestens eine Einheit ist mehrfach in der Abrechnung angelegt: ${doppelteEinheiten
      .slice(0, 6)
      .map((item) => getPruefpunktEinheitLabel(item))
      .join(", ")}${doppelteEinheiten.length > 6 ? " ..." : ""}.`;
  } else if (fremdeEinheiten.length > 0) {
    hinweis = `Die Abrechnung enthält Einheiten, die nicht zur gewählten WEG gehören: ${fremdeEinheiten
      .slice(0, 6)
      .map((item) => getPruefpunktEinheitLabel(item))
      .join(", ")}${fremdeEinheiten.length > 6 ? " ..." : ""}.`;
  }

  return {
    id: "weg-einheiten",
    label: "Alle WEG-Einheiten einbezogen",
    istErfuellt,
    hinweis,
  };
}

function createAbschlusspruefung(
  positionen: AbrechnungsPosition[],
  einheiten: Abrechnungseinheit[],
  wegSollEinheiten: Abrechnungseinheit[] = [],
): Abschlusspruefung {
  const aktivePositionen = positionen.filter((item) => isPositionAktiv(item));
  const verteilungAktiverPositionen = createVerteilungAktiverPositionen(positionen, einheiten);
  const bekannteEinheitenIds = new Set(einheiten.map((item) => item.id));
  const deckungspruefung = createDeckungspruefung(
    positionen,
    einheiten,
    verteilungAktiverPositionen,
  );

  const aktivePositionenOhneVerteilschluessel = aktivePositionen.filter(
    (item) => String(item.verteilschluessel ?? "").trim() === "",
  );

  const direktePositionenOhneEinheit = aktivePositionen.filter(
    (item) =>
      item.verteilschluessel === "Direkt" &&
      (!item.direkteEinheitId || !bekannteEinheitenIds.has(item.direkteEinheitId)),
  );

  const wegKostenarten = positionen.filter((item) => item.art !== "sonder");
  const nichtBewerteteWegKostenarten = wegKostenarten.filter(
    (item) => item.bewertungsstatus === "offen",
  );

  const einheitenOhneVorauszahlung = einheiten.filter(
    (item) => !Number.isFinite(item.vorauszahlung),
  );

  const unvollstaendigVerteiltePositionen = verteilungAktiverPositionen.filter(
    (row) => Math.abs(row.position.betrag - row.verteilteSumme) > PRUEF_TOLERANZ,
  );

  const wegEinheitenPruefpunkt = createWegEinheitenPruefpunkt(
    einheiten,
    wegSollEinheiten,
  );

  const pruefpunkte: Pruefpunkt[] = [
    {
      id: "aktive-position",
      label: "Mindestens 1 aktive Position vorhanden",
      istErfuellt: aktivePositionen.length > 0,
      hinweis: "Mindestens eine aktive Position mit Betrag größer 0 ist erforderlich.",
    },
    {
      id: "weg-kostenarten",
      label: "Objektkostenstellen vollständig bewertet",
      istErfuellt: nichtBewerteteWegKostenarten.length === 0,
      hinweis:
        nichtBewerteteWegKostenarten.length === 0
          ? ""
          : `${nichtBewerteteWegKostenarten.length} Objektkostenstellen sind noch offen: ${nichtBewerteteWegKostenarten
              .slice(0, 6)
              .map((item) => item.bezeichnung)
              .join(", ")}${nichtBewerteteWegKostenarten.length > 6 ? " ..." : ""}.`,
    },
    {
      id: "verteilschluessel",
      label: "Jede aktive Position hat einen Verteilschlüssel",
      istErfuellt: aktivePositionenOhneVerteilschluessel.length === 0,
      hinweis:
        aktivePositionenOhneVerteilschluessel.length === 0
          ? ""
          : `Bei ${aktivePositionenOhneVerteilschluessel.length} aktiven Positionen fehlt der Verteilschlüssel.`,
    },
    {
      id: "direkt-einheit",
      label: "Bei Direkt-Verteilung ist eine konkrete Einheit gesetzt",
      istErfuellt: direktePositionenOhneEinheit.length === 0,
      hinweis:
        direktePositionenOhneEinheit.length === 0
          ? ""
          : `Bei Direkt-Verteilung fehlt oder passt die konkrete Einheit nicht: ${direktePositionenOhneEinheit
              .map((item) => item.kostenart)
              .join(", ")}.`,
    },
    {
      id: "einheiten",
      label: "Abrechnungseinheiten sind vorhanden",
      istErfuellt: einheiten.length > 0,
      hinweis: "Abrechnungseinheiten fehlen vollständig.",
    },
    wegEinheitenPruefpunkt,
    {
      id: "vorauszahlungen",
      label: "Vorauszahlungen je Einheit sind vorhanden",
      istErfuellt: einheitenOhneVorauszahlung.length === 0,
      hinweis:
        einheitenOhneVorauszahlung.length === 0
          ? ""
          : `Bei folgenden Einheiten fehlt die Vorauszahlung: ${einheitenOhneVorauszahlung
              .map((item) => item.einheit)
              .join(", ")}.`,
    },
    {
      id: "deckung",
      label: "Ausgaben sind durch Vorauszahlungen und Nachforderungen gedeckt",
      istErfuellt: deckungspruefung.istErfuellt,
      hinweis: deckungspruefung.hinweis,
    },
    {
      id: "verteilung",
      label: "Verteilung je aktiver Position ist rechnerisch vollständig",
      istErfuellt: unvollstaendigVerteiltePositionen.length === 0,
      hinweis:
        unvollstaendigVerteiltePositionen.length === 0
          ? ""
          : `Die Verteilung ist rechnerisch nicht vollständig bei: ${unvollstaendigVerteiltePositionen
              .map((row) => row.position.kostenart)
              .join(", ")}.`,
    },
  ];

  const fehlendeAngaben = pruefpunkte
    .filter((item) => !item.istErfuellt)
    .map((item) => item.hinweis);

  return {
    istVollstaendig: pruefpunkte.every((item) => item.istErfuellt),
    fehlendeAngaben,
    pruefpunkte,
  };
}

function getObjektkostenstellenBasis(
  objektDisplayId: string,
): ObjektkostenstelleQuelle[] {
  return (
    objektkostenstellenByObjektDisplayId[objektDisplayId] ??
    objektkostenstellenByObjektDisplayId.DEFAULT
  );
}

function mapStandardSchluesselToVerteilschluessel(
  standardSchluessel?: string,
): Verteilschluessel {
  switch (standardSchluessel) {
    case "Fläche":
      return "Fläche";
    case "Einheit":
      return "Einheit";
    case "Direkt":
      return "Direkt";
    case "Person":
    case "Personen":
      return "Personen";
    case "Verbrauch":
      return "Direkt";
    case "MEA":
    default:
      return "MEA";
  }
}

function createObjektkostenstellenId(value: string) {
  return normalizeLookupValue(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "kostenstelle";
}

function getObjektkostenstellenAusObjektmodul(
  objektDisplayId: string,
  objectUtilitiesByStorageId: Record<string, ObjectModuleUtility[]>,
  objectStorageKeyByDisplayId: Record<string, string>,
): ObjektkostenstelleQuelle[] {
  const basis = getObjektkostenstellenBasis(objektDisplayId);
  const storageKey = getObjectStorageKeyByDisplayId(
    objektDisplayId,
    objectStorageKeyByDisplayId,
  );

  if (!storageKey) {
    return basis;
  }

  const utilities = objectUtilitiesByStorageId[storageKey] ?? [];
  if (utilities.length === 0) {
    return basis;
  }

  const importedByName = new Map<string, ObjektkostenstelleQuelle>();
  const basisByName = new Map(
    basis.map((item) => [normalizeLookupValue(item.name), item] as const),
  );

  utilities.forEach((utility) => {
    const kostenartMeta =
      kostenarten.find((item) => item.id === utility.category) ?? null;
    const name =
      utility.label.trim() ||
      kostenartMeta?.name ||
      utility.category.trim();
    const normalizedName = normalizeLookupValue(name);

    if (normalizedName === "") {
      return;
    }

    const existingBasis = basisByName.get(normalizedName);

    importedByName.set(normalizedName, {
      id:
        existingBasis?.id ??
        `objmod-${createObjektkostenstellenId(kostenartMeta?.id ?? name)}`,
      name,
      umlagefaehig:
        existingBasis?.umlagefaehig ??
        kostenartMeta?.umlagefaehigMieter ??
        true,
      verteilschluessel:
        existingBasis?.verteilschluessel ??
        mapStandardSchluesselToVerteilschluessel(
          kostenartMeta?.standardSchluessel,
        ),
      art:
        existingBasis?.art ??
        (kostenartMeta?.aktivDefault ? "standard" : "optional"),
    });
  });

  basis.forEach((item) => {
    const normalizedName = normalizeLookupValue(item.name);
    if (!importedByName.has(normalizedName)) {
      importedByName.set(normalizedName, item);
    }
  });

  return Array.from(importedByName.values());
}

function createKatalogPosition(
  abrechnungId: string,
  item: ObjektkostenstelleQuelle,
  betragOverride?: number,
): AbrechnungsPosition {
  return {
    id: `${abrechnungId}__${item.art === "standard" ? "STD" : "OPT"}__${item.id}`,
    bezeichnung: item.name,
    kostenart: item.name,
    betrag: betragOverride ?? 0,
    umlagefaehig: item.umlagefaehig,
    verteilschluessel: item.verteilschluessel,
    direkteEinheitId: null,
    erfasstAm: currentDateForDisplay(),
    art: item.art,
    bewertungsstatus: (betragOverride ?? 0) > 0 ? "erfasst" : "offen",
  };
}

function createInitialPositionenForAbrechnung(
  abrechnungId: string,
  objektDisplayId: string,
): AbrechnungsPosition[] {
  const betragOverrides = initialBetragOverridesByAbrechnungId[abrechnungId] ?? {};
  const objektkostenstellen = getObjektkostenstellenBasis(objektDisplayId);
  const katalogPositionen = objektkostenstellen.map((item) =>
    createKatalogPosition(abrechnungId, item, betragOverrides[item.name]),
  );
  const sonderpositionen = initialSonderpositionenByAbrechnungId[abrechnungId] ?? [];

  return [...katalogPositionen, ...sonderpositionen];
}

function createInitialPositionsState(): Record<string, AbrechnungsPosition[]> {
  const result: Record<string, AbrechnungsPosition[]> = {};

  beispielAbrechnungen.forEach((abrechnung) => {
    result[abrechnung.id] = createInitialPositionenForAbrechnung(
      abrechnung.id,
      abrechnung.objektDisplayId,
    );
  });

  return result;
}

function createInitialEinheitenState(): Record<string, Abrechnungseinheit[]> {
  const result: Record<string, Abrechnungseinheit[]> = {};

  beispielAbrechnungen.forEach((abrechnung) => {
    result[abrechnung.id] = createInitialEinheitenForAbrechnung(abrechnung.id);
  });

  return result;
}

function isSeedPositionenState(
  abrechnungId: string,
  objektDisplayId: string,
  positionen: AbrechnungsPosition[],
) {
  return areSerializedValuesEqual(
    positionen,
    createInitialPositionenForAbrechnung(abrechnungId, objektDisplayId),
  );
}

function isSeedEinheitenState(
  abrechnungId: string,
  einheiten: Abrechnungseinheit[],
) {
  return areSerializedValuesEqual(
    einheiten,
    createInitialEinheitenForAbrechnung(abrechnungId),
  );
}

function createAbrechnungsergebnisJeEinheit(
  einheiten: Abrechnungseinheit[],
  verteilungAktiverPositionen: VerteilungsZeile[],
): ReportEinheitErgebnis[] {
  return [...einheiten]
    .sort((left, right) => left.einheit.localeCompare(right.einheit, "de"))
    .map((einheit) => {
      const umlagefaehigAnteil = roundToCents(
        verteilungAktiverPositionen.reduce((sum, row) => {
          const anteil =
            row.verteilungJeEinheit.find((entry) => entry.id === einheit.id)?.anteil ?? 0;
          return row.position.umlagefaehig ? sum + anteil : sum;
        }, 0),
      );

      const nichtUmlagefaehigAnteil = roundToCents(
        verteilungAktiverPositionen.reduce((sum, row) => {
          const anteil =
            row.verteilungJeEinheit.find((entry) => entry.id === einheit.id)?.anteil ?? 0;
          return row.position.umlagefaehig ? sum : sum + anteil;
        }, 0),
      );

      const gesamtAnteil = roundToCents(
        umlagefaehigAnteil + nichtUmlagefaehigAnteil,
      );
      const mieterSaldo = roundToCents(umlagefaehigAnteil - einheit.vorauszahlung);
      const mieterStatus =
        Math.abs(mieterSaldo) < PRUEF_TOLERANZ
          ? "Ausgeglichen"
          : mieterSaldo > 0
            ? "Nachzahlung"
            : "Guthaben";

      return {
        ...einheit,
        umlagefaehigAnteil,
        nichtUmlagefaehigAnteil,
        gesamtAnteil,
        mieterSaldo,
        mieterStatus,
      };
    });
}


function createDeckungspruefung(
  positionen: AbrechnungsPosition[],
  einheiten: Abrechnungseinheit[],
  verteilungAktiverPositionen: VerteilungsZeile[],
): Deckungspruefung {
  const aktivePositionen = positionen.filter((item) => isPositionAktiv(item));

  if (aktivePositionen.length === 0 || einheiten.length === 0) {
    return {
      istErfuellt: false,
      summeAusgaben: roundToCents(
        positionen.reduce((sum, position) => sum + position.betrag, 0),
      ),
      summeVorauszahlungen: roundToCents(
        einheiten.reduce((sum, einheit) => sum + einheit.vorauszahlung, 0),
      ),
      summeNachforderungen: 0,
      summeGuthaben: 0,
      deckungsdifferenz: 0,
      hinweis:
        "Die Deckungsprüfung kann erst nach vollständiger Kosten- und Einheitenbasis durchgeführt werden.",
    };
  }

  const abrechnungsergebnisJeEinheit = createAbrechnungsergebnisJeEinheit(
    einheiten,
    verteilungAktiverPositionen,
  );

  const summeAusgaben = roundToCents(
    positionen.reduce((sum, position) => sum + position.betrag, 0),
  );
  const summeVorauszahlungen = roundToCents(
    einheiten.reduce((sum, einheit) => sum + einheit.vorauszahlung, 0),
  );
  const summeNachforderungen = roundToCents(
    abrechnungsergebnisJeEinheit.reduce((sum, einheit) => {
      const deckungssaldo = roundToCents(
        einheit.gesamtAnteil - einheit.vorauszahlung,
      );
      return deckungssaldo > 0 ? sum + deckungssaldo : sum;
    }, 0),
  );
  const summeGuthaben = roundToCents(
    abrechnungsergebnisJeEinheit.reduce((sum, einheit) => {
      const deckungssaldo = roundToCents(
        einheit.gesamtAnteil - einheit.vorauszahlung,
      );
      return deckungssaldo < 0 ? sum + Math.abs(deckungssaldo) : sum;
    }, 0),
  );

  const verfuegbareDeckung = roundToCents(
    summeVorauszahlungen + summeNachforderungen,
  );
  const erforderlicheDeckung = roundToCents(summeAusgaben + summeGuthaben);
  const deckungsdifferenz = roundToCents(
    verfuegbareDeckung - erforderlicheDeckung,
  );
  const istErfuellt = Math.abs(deckungsdifferenz) <= PRUEF_TOLERANZ;

  return {
    istErfuellt,
    summeAusgaben,
    summeVorauszahlungen,
    summeNachforderungen,
    summeGuthaben,
    deckungsdifferenz,
    hinweis: istErfuellt
      ? ""
      : `Ausgaben ${formatCurrency(summeAusgaben)} stehen Vorauszahlungen ${formatCurrency(
          summeVorauszahlungen,
        )}, Nachforderungen ${formatCurrency(
          summeNachforderungen,
        )} und Guthaben ${formatCurrency(
          summeGuthaben,
        )} gegenüber. Differenz ${formatCurrency(Math.abs(deckungsdifferenz))}.`,
  };
}

function createVorbereitetenReport(
  item: NebenkostenAbrechnung,
  positionen: AbrechnungsPosition[],
  einheiten: Abrechnungseinheit[],
  reportFreigegeben = false,
  wegSollEinheiten: Abrechnungseinheit[] = [],
): VorbereiteterReport {
  const verteilungAktiverPositionen = createVerteilungAktiverPositionen(positionen, einheiten);
  const abschlusspruefung = createAbschlusspruefung(
    positionen,
    einheiten,
    wegSollEinheiten,
  );

  const summen: ReportSummen = {
    summeGesamt: roundToCents(
      positionen.reduce((sum, position) => sum + position.betrag, 0),
    ),
    summeUmlagefaehig: roundToCents(
      positionen
        .filter((position) => position.umlagefaehig)
        .reduce((sum, position) => sum + position.betrag, 0),
    ),
    summeNichtUmlagefaehig: roundToCents(
      positionen
        .filter((position) => !position.umlagefaehig)
        .reduce((sum, position) => sum + position.betrag, 0),
    ),
  };

  const einheitenSummen: ReportEinheitenSummen = {
    summeFlaeche: roundToCents(
      einheiten.reduce((sum, einheit) => sum + einheit.flaeche, 0),
    ),
    summeMea: roundToCents(
      einheiten.reduce((sum, einheit) => sum + einheit.mea, 0),
    ),
    summeVorauszahlung: roundToCents(
      einheiten.reduce((sum, einheit) => sum + einheit.vorauszahlung, 0),
    ),
  };

  const abrechnungsergebnisJeEinheit = createAbrechnungsergebnisJeEinheit(
    einheiten,
    verteilungAktiverPositionen,
  );

  return {
    item,
    abschlusspruefung,
    summen,
    einheitenSummen,
    verteilungAktiverPositionen,
    abrechnungsergebnisJeEinheit,
    metadaten: {
      aktivePositionenCount: positionen.filter((position) => isPositionAktiv(position)).length,
      einheitenCount: einheiten.length,
      problemCount: abschlusspruefung.pruefpunkte.filter((punkt) => !punkt.istErfuellt).length,
      reportFreigabefaehig: abschlusspruefung.istVollstaendig,
      reportFreigegeben,
    },
  };
}

function createFinalReportSnapshot(
  item: NebenkostenAbrechnung,
  positionen: AbrechnungsPosition[],
  einheiten: Abrechnungseinheit[],
  wegSollEinheiten: Abrechnungseinheit[] = [],
): FinalReportSnapshot {
  return {
    freigegebenAm:
      item.positivGeprueftAm ?? item.geaendertAm ?? currentDateForDisplay(),
    report: createVorbereitetenReport(
      item,
      positionen,
      einheiten,
      true,
      wegSollEinheiten,
    ),
  };
}

export function NebenkostenAbrechnungen({ documents }: NebenkostenAbrechnungenProps) {
  const [abrechnungen, setAbrechnungen] = useState<NebenkostenAbrechnung[]>([]);
  const [suchtext, setSuchtext] = useState("");
  const [objektFilter, setObjektFilter] = useState("ALLE");
  const [reportYearFilter, setReportYearFilter] = useState("ALLE");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("AKTIV");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bearbeitenOpen, setBearbeitenOpen] = useState(false);
  const [selectedAbrechnungId, setSelectedAbrechnungId] = useState<string | null>(null);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [positionsByAbrechnungId, setPositionsByAbrechnungId] = useState<
    Record<string, AbrechnungsPosition[]>
  >({});
  const [einheitenByAbrechnungId, setEinheitenByAbrechnungId] = useState<
    Record<string, Abrechnungseinheit[]>
  >({});
  const [objectApartmentsByStorageId, setObjectApartmentsByStorageId] = useState<
    Record<string, ObjectModuleApartment[]>
  >({});
  const [objectTenanciesByStorageId, setObjectTenanciesByStorageId] = useState<
    Record<string, ObjectModuleTenancy[]>
  >({});
  const [objectUtilitiesByStorageId, setObjectUtilitiesByStorageId] = useState<
    Record<string, ObjectModuleUtility[]>
  >({});
  const [bekannteObjekte, setBekannteObjekte] = useState<LocalObjectReference[]>([]);
  const [finalReportSnapshotsByAbrechnungId, setFinalReportSnapshotsByAbrechnungId] =
    useState<Record<string, FinalReportSnapshot>>({});
  const [hasLoadedNebenkostenStorage, setHasLoadedNebenkostenStorage] = useState(false);
  const [workspaceSyncError, setWorkspaceSyncError] = useState<string | null>(null);
  const [listSyncError, setListSyncError] = useState<string | null>(null);
  const [serverValidation, setServerValidation] =
    useState<UtilityStatementValidationResponse | null>(null);
  const [serverFilteredAbrechnungIds, setServerFilteredAbrechnungIds] = useState<string[] | null>(
    null,
  );
  const [hasLoadedObjectModule, setHasLoadedObjectModule] = useState(false);
  const [katalogEditorId, setKatalogEditorId] = useState<string | null>(null);
  const [katalogBetrag, setKatalogBetrag] = useState("");
  const [katalogVerteilschluessel, setKatalogVerteilschluessel] =
    useState<Verteilschluessel>("Direkt");
  const [katalogBewertungsstatus, setKatalogBewertungsstatus] =
    useState<Bewertungsstatus>("offen");
  const [katalogDirekteEinheitId, setKatalogDirekteEinheitId] = useState("");
  const [bearbeiteteSonderpositionId, setBearbeiteteSonderpositionId] = useState<
    string | null
  >(null);
  const [sonderpositionForm, setSonderpositionForm] = useState<SonderpositionForm>(
    createEmptySonderpositionForm(),
  );
  const [einheitEditorId, setEinheitEditorId] = useState<string | null>(null);
  const [einheitVorauszahlung, setEinheitVorauszahlung] = useState("");

  const objectStorageKeys = useMemo(() => {
    return Array.from(
      new Set([
        ...Object.keys(objectApartmentsByStorageId),
        ...Object.keys(objectTenanciesByStorageId),
        ...Object.keys(objectUtilitiesByStorageId),
      ]),
    ).filter((item) => String(item ?? "").trim() !== "");
  }, [
    objectApartmentsByStorageId,
    objectTenanciesByStorageId,
    objectUtilitiesByStorageId,
  ]);

  const objectStorageKeyByDisplayId = useMemo(() => {
    return Object.fromEntries(
      bekannteObjekte.map((item) => [normalizeDisplayId(item.displayId), String(item.id)]),
    ) as Record<string, string>;
  }, [bekannteObjekte]);

  function applyPersistedWorkspace(
    persistedAbrechnungen: NebenkostenAbrechnung[],
    persistedPositionen: Record<string, AbrechnungsPosition[]>,
    persistedEinheiten: Record<string, Abrechnungseinheit[]>,
    persistedFinalReports: Record<string, FinalReportSnapshot>,
  ) {
    setAbrechnungen(persistedAbrechnungen);
    setPositionsByAbrechnungId(persistedPositionen);
    setEinheitenByAbrechnungId(persistedEinheiten);
    setFinalReportSnapshotsByAbrechnungId(persistedFinalReports);
  }

  function mapWorkspaceSettlementToAbrechnung(
    item: UtilityStatementsWorkspaceSettlement,
  ): NebenkostenAbrechnung {
    return {
      id: item.id,
      objectId: item.objectId ?? null,
      objektDisplayId: item.objektDisplayId,
      objektName: item.objektName,
      zeitraumVon: item.zeitraumVon,
      zeitraumBis: item.zeitraumBis,
      status: item.status as NebenkostenAbrechnung["status"],
      erstelltAm: item.erstelltAm,
      geaendertAm: item.geaendertAm,
      positivGeprueftAm: item.positivGeprueftAm ?? undefined,
    };
  }

  function buildSettlementPayload(
    abrechnung: NebenkostenAbrechnung,
    overrides?: {
      status?: NebenkostenAbrechnung["status"];
      geaendertAm?: string;
      positivGeprueftAm?: string;
      finalReportSnapshot?: FinalReportSnapshot | null;
    },
  ) {
    return {
      ...abrechnung,
      objectId:
        abrechnung.objectId ??
        objectStorageKeyByDisplayId[normalizeDisplayId(abrechnung.objektDisplayId)] ??
        null,
      status: overrides?.status ?? abrechnung.status,
      geaendertAm: overrides?.geaendertAm ?? abrechnung.geaendertAm,
      positivGeprueftAm:
        overrides?.positivGeprueftAm ?? abrechnung.positivGeprueftAm ?? null,
      positions: positionsByAbrechnungId[abrechnung.id] ?? [],
      einheiten: einheitenByAbrechnungId[abrechnung.id] ?? [],
      finalReportSnapshot:
        overrides?.finalReportSnapshot ??
        finalReportSnapshotsByAbrechnungId[abrechnung.id] ??
        null,
    };
  }

  function buildWorkspacePayload() {
    return {
      settlements: abrechnungen.map((abrechnung) => buildSettlementPayload(abrechnung)),
    };
  }

  const auswahlObjekte = useMemo(() => {
    const result = new Map<string, LocalObjectReference>();

    bekannteObjekte.forEach((item) => {
      const readableName = getReadableObjectName(item);

      if (readableName === "") {
        return;
      }

      result.set(item.displayId, {
        ...item,
        name: readableName,
        address: item.address,
      });
    });

    return Array.from(result.values()).sort((left, right) =>
      getReadableObjectName(left).localeCompare(getReadableObjectName(right), "de", {
        sensitivity: "base",
      }),
    );
  }, [bekannteObjekte]);

  const objektOptionen = useMemo(
    () =>
      auswahlObjekte.map((item) => ({
        value: item.displayId,
        label: getReadableObjectName(item),
      })),
    [auswahlObjekte],
  );

  const reportYearOptionen = useMemo(() => {
    return Array.from(
      new Set(
        abrechnungen
          .map((item) => getReportYearFromAbrechnung(item))
          .filter((item): item is number => item !== null),
      ),
    ).sort((left, right) => right - left);
  }, [abrechnungen]);

  const lokalGefilterteAbrechnungen = useMemo(() => {
    return abrechnungen.filter((item) => {
      const matchSuchtext =
        suchtext.trim() === "" ||
        item.objektName.toLowerCase().includes(suchtext.toLowerCase()) ||
        item.objektDisplayId.toLowerCase().includes(suchtext.toLowerCase()) ||
        item.id.toLowerCase().includes(suchtext.toLowerCase());

      const matchObjekt =
        objektFilter === "ALLE" ||
        normalizeDisplayId(item.objektDisplayId) === normalizeDisplayId(objektFilter);

      const matchStatus =
        statusFilter === "ALLE"
          ? true
          : statusFilter === "AKTIV"
            ? item.status === "In Arbeit"
            : item.status === statusFilter;

      const reportYear = getReportYearFromAbrechnung(item);
      const matchReportYear =
        reportYearFilter === "ALLE" || String(reportYear ?? "") === reportYearFilter;

      return matchSuchtext && matchObjekt && matchStatus && matchReportYear;
    });
  }, [abrechnungen, objektFilter, reportYearFilter, statusFilter, suchtext]);

  const gefilterteAbrechnungen = useMemo(() => {
    if (serverFilteredAbrechnungIds === null) {
      return lokalGefilterteAbrechnungen;
    }

    const allowedIds = new Set(serverFilteredAbrechnungIds);

    return abrechnungen.filter((item) => allowedIds.has(item.id));
  }, [abrechnungen, lokalGefilterteAbrechnungen, serverFilteredAbrechnungIds]);

  useEffect(() => {
    if (gefilterteAbrechnungen.length === 0) {
      setSelectedAbrechnungId(null);
      return;
    }

    if (!selectedAbrechnungId) {
      setSelectedAbrechnungId(gefilterteAbrechnungen[0].id);
      return;
    }

    const existsInFilteredList = gefilterteAbrechnungen.some(
      (item) => item.id === selectedAbrechnungId,
    );

    if (!existsInFilteredList) {
      setSelectedAbrechnungId(gefilterteAbrechnungen[0].id);
    }
  }, [gefilterteAbrechnungen, selectedAbrechnungId]);

  useEffect(() => {
    setKatalogEditorId(null);
    setKatalogBetrag("");
    setKatalogVerteilschluessel("Direkt");
    setKatalogBewertungsstatus("offen");
    setKatalogDirekteEinheitId("");
    setBearbeiteteSonderpositionId(null);
    setSonderpositionForm(createEmptySonderpositionForm());
    setEinheitEditorId(null);
    setEinheitVorauszahlung("");
  }, [selectedAbrechnungId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadWorkspace() {
      try {
        const workspace = await getUtilityStatementsWorkspace();

        if (isCancelled) {
          return;
        }

        if (Array.isArray(workspace.settlements)) {
          applyPersistedWorkspace(
            workspace.settlements.map((item) => mapWorkspaceSettlementToAbrechnung(item)),
            Object.fromEntries(
              workspace.settlements.map((item) => [
                item.id,
                Array.isArray(item.positions)
                  ? (item.positions as AbrechnungsPosition[])
                  : [],
              ]),
            ),
            Object.fromEntries(
              workspace.settlements.map((item) => [
                item.id,
                Array.isArray(item.einheiten)
                  ? (item.einheiten as Abrechnungseinheit[])
                  : [],
              ]),
            ),
            Object.fromEntries(
              workspace.settlements
                .filter((item) => item.finalReportSnapshot && typeof item.finalReportSnapshot === "object")
                .map((item) => [item.id, item.finalReportSnapshot as FinalReportSnapshot]),
            ),
          );
          setWorkspaceSyncError(null);
          setHasLoadedNebenkostenStorage(true);
          return;
        }
      } catch {
        if (!isCancelled) {
          setWorkspaceSyncError("Nebenkosten-Arbeitsstand konnte nicht aus der API geladen werden. Lokaler Stand wird verwendet.");
        }
      }

      if (isCancelled) {
        return;
      }

      const gespeicherteAbrechnungen = readStorageValue<NebenkostenAbrechnung[] | null>(
        NEBENKOSTEN_STORAGE_KEYS.abrechnungen,
        null,
      );
      const gespeichertePositionen = readStorageValue<
        Record<string, AbrechnungsPosition[]> | null
      >(NEBENKOSTEN_STORAGE_KEYS.positionen, null);
      const gespeicherteEinheiten = readStorageValue<
        Record<string, Abrechnungseinheit[]> | null
      >(NEBENKOSTEN_STORAGE_KEYS.einheiten, null);
      const gespeicherteFinalReports = readStorageValue<
        Record<string, FinalReportSnapshot> | null
      >(NEBENKOSTEN_STORAGE_KEYS.finalReports, null);

      const bereinigteAbrechnungen = Array.isArray(gespeicherteAbrechnungen)
        ? gespeicherteAbrechnungen.filter(
            (item) => !isLegacyMockObjectValue(String(item.objektName ?? "")),
          )
        : [];

      applyPersistedWorkspace(
        bereinigteAbrechnungen,
        gespeichertePositionen && typeof gespeichertePositionen === "object"
          ? gespeichertePositionen
          : {},
        gespeicherteEinheiten && typeof gespeicherteEinheiten === "object"
          ? gespeicherteEinheiten
          : {},
        gespeicherteFinalReports && typeof gespeicherteFinalReports === "object"
          ? gespeicherteFinalReports
          : {},
      );
      setHasLoadedNebenkostenStorage(true);
    }

    void loadWorkspace();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedNebenkostenStorage) {
      return;
    }

    let isCancelled = false;

    async function loadFilteredSettlements() {
      try {
        const response = await listUtilityStatements({
          q: suchtext.trim() === "" ? undefined : suchtext.trim(),
          objectDisplayId: objektFilter === "ALLE" ? undefined : objektFilter,
          status: statusFilter,
          reportYear: reportYearFilter === "ALLE" ? undefined : reportYearFilter,
        });

        if (isCancelled) {
          return;
        }

        setServerFilteredAbrechnungIds(
          Array.isArray(response.settlements)
            ? response.settlements.map((item) => item.id)
            : [],
        );
        setListSyncError(null);
      } catch {
        if (isCancelled) {
          return;
        }

        setServerFilteredAbrechnungIds(null);
        setListSyncError(
          "Abrechnungsbestand konnte nicht serverseitig geladen werden. Lokaler Filter wird verwendet.",
        );
      }
    }

    void loadFilteredSettlements();

    return () => {
      isCancelled = true;
    };
  }, [hasLoadedNebenkostenStorage, objektFilter, reportYearFilter, statusFilter, suchtext]);

  useEffect(() => {
    if (!selectedAbrechnungId) {
      setServerValidation(null);
      return;
    }

    let isCancelled = false;
    const validationTargetId = selectedAbrechnungId;

    async function loadValidation() {
      try {
        const validation = await getUtilityStatementValidation(validationTargetId);

        if (!isCancelled) {
          setServerValidation(validation);
        }
      } catch {
        if (!isCancelled) {
          setServerValidation(null);
        }
      }
    }

    void loadValidation();

    return () => {
      isCancelled = true;
    };
  }, [selectedAbrechnungId, abrechnungen]);

  useEffect(() => {
    if (!hasLoadedNebenkostenStorage) {
      return;
    }

    const handle = window.setTimeout(() => {
      void syncUtilityStatementsWorkspace(buildWorkspacePayload())
        .then(() => {
          setWorkspaceSyncError(null);
        })
        .catch(() => {
          setWorkspaceSyncError("Nebenkosten-Arbeitsstand konnte nicht serverseitig gespeichert werden.");
        });
    }, 400);

    return () => {
      window.clearTimeout(handle);
    };
  }, [
    abrechnungen,
    einheitenByAbrechnungId,
    finalReportSnapshotsByAbrechnungId,
    hasLoadedNebenkostenStorage,
    objectStorageKeyByDisplayId,
    positionsByAbrechnungId,
  ]);

  useEffect(() => {
    setObjectApartmentsByStorageId(
      readStorageRecord<ObjectModuleApartment>(OBJECT_MODULE_STORAGE_KEYS.apartments),
    );
    setObjectTenanciesByStorageId(
      readStorageRecord<ObjectModuleTenancy>(OBJECT_MODULE_STORAGE_KEYS.tenancies),
    );
    setObjectUtilitiesByStorageId(
      readStorageRecord<ObjectModuleUtility>(OBJECT_MODULE_STORAGE_KEYS.utilities),
    );
    setHasLoadedObjectModule(true);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadObjects() {
      try {
        const objects = await getObjects();

        if (isCancelled) {
          return;
        }

        setBekannteObjekte(createObjectReferencesFromService(objects));
      } catch {
        if (!isCancelled) {
          setBekannteObjekte([]);
        }
      }
    }

    void loadObjects();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (bekannteObjekte.length === 0) {
      return;
    }

    setAbrechnungen((prev) =>
      prev.map((item) => {
        const match =
          bekannteObjekte.find(
            (entry) =>
              normalizeDisplayId(entry.displayId) === normalizeDisplayId(item.objektDisplayId),
          ) ?? null;

        if (!match) {
          return item;
        }

        const readableName = getReadableObjectName(match);

        if (
          readableName === "" ||
          (!isTechnicalObjectName(item.objektName) && String(item.objektName ?? "").trim() !== "")
        ) {
          return item;
        }

        return {
          ...item,
          objectId: match.id,
          objektName: readableName,
        };
      }),
    );
  }, [bekannteObjekte]);

  useEffect(() => {
    if (!hasLoadedNebenkostenStorage || !hasLoadedObjectModule) {
      return;
    }

    setPositionsByAbrechnungId((prev) => {
      let hasChanged = false;
      const nextState: Record<string, AbrechnungsPosition[]> = { ...prev };

      abrechnungen.forEach((abrechnung) => {
        if (isFinalReportFreigegeben(abrechnung)) {
          return;
        }

        const previousPositionen = prev[abrechnung.id] ?? [];

        if (previousPositionen.length > 0) {
          return;
        }

        const objektkostenstellen = getObjektkostenstellenAusObjektmodul(
          abrechnung.objektDisplayId,
          objectUtilitiesByStorageId,
          objectStorageKeyByDisplayId,
        );

        if (!objektkostenstellen || objektkostenstellen.length === 0) {
          return;
        }

        const importedPositionen = createPositionenFromObjektmodul(
          abrechnung.id,
          objektkostenstellen,
          previousPositionen,
        );

        if (!areSerializedValuesEqual(previousPositionen, importedPositionen)) {
          nextState[abrechnung.id] = importedPositionen;
          hasChanged = true;
        }
      });

      return hasChanged ? nextState : prev;
    });

    setEinheitenByAbrechnungId((prev) => {
      let hasChanged = false;
      const nextState: Record<string, Abrechnungseinheit[]> = { ...prev };

      abrechnungen.forEach((abrechnung) => {
        if (isFinalReportFreigegeben(abrechnung)) {
          return;
        }

        const previousEinheiten = prev[abrechnung.id] ?? [];

        if (previousEinheiten.length > 0) {
          return;
        }

        const importedEinheiten = createEinheitenFromObjektmodul(
          abrechnung.id,
          abrechnung.objektDisplayId,
          abrechnung.objektName,
          objectApartmentsByStorageId,
          objectTenanciesByStorageId,
          previousEinheiten,
          objectStorageKeyByDisplayId,
        );

        if (!importedEinheiten || importedEinheiten.length === 0) {
          return;
        }

        if (!areSerializedValuesEqual(previousEinheiten, importedEinheiten)) {
          nextState[abrechnung.id] = importedEinheiten;
          hasChanged = true;
        }
      });

      return hasChanged ? nextState : prev;
    });
  }, [
    abrechnungen,
    hasLoadedNebenkostenStorage,
    hasLoadedObjectModule,
    objectApartmentsByStorageId,
    objectStorageKeyByDisplayId,
    objectTenanciesByStorageId,
    objectUtilitiesByStorageId,
  ]);

  useEffect(() => {
    if (!hasLoadedNebenkostenStorage || !hasLoadedObjectModule) {
      return;
    }

    setFinalReportSnapshotsByAbrechnungId((prev) => {
      let hasChanged = false;
      const nextState = { ...prev };

      abrechnungen.forEach((abrechnung) => {
        if (!isFinalReportFreigegeben(abrechnung) || nextState[abrechnung.id]) {
          return;
        }

        nextState[abrechnung.id] = createFinalReportSnapshot(
          abrechnung,
          positionsByAbrechnungId[abrechnung.id] ?? [],
          einheitenByAbrechnungId[abrechnung.id] ?? [],
          getWegSollEinheitenForAbrechnung(abrechnung),
        );
        hasChanged = true;
      });

      return hasChanged ? nextState : prev;
    });
  }, [
    abrechnungen,
    einheitenByAbrechnungId,
    hasLoadedNebenkostenStorage,
    hasLoadedObjectModule,
    positionsByAbrechnungId,
  ]);

  const selectedAbrechnung = useMemo(() => {
    return abrechnungen.find((item) => item.id === selectedAbrechnungId) ?? null;
  }, [abrechnungen, selectedAbrechnungId]);

  const abrechnungZumBearbeiten = useMemo(() => {
    return abrechnungen.find((item) => item.id === bearbeitenId) ?? null;
  }, [abrechnungen, bearbeitenId]);

  const selectedPositionen = useMemo(() => {
    if (!selectedAbrechnungId) return [];
    return positionsByAbrechnungId[selectedAbrechnungId] ?? [];
  }, [positionsByAbrechnungId, selectedAbrechnungId]);

  const selectedEinheiten = useMemo(() => {
    if (!selectedAbrechnungId) return [];
    return einheitenByAbrechnungId[selectedAbrechnungId] ?? [];
  }, [einheitenByAbrechnungId, selectedAbrechnungId]);

  const standardPositionen = useMemo(() => {
    return selectedPositionen.filter((item) => item.art === "standard");
  }, [selectedPositionen]);

  const einheitenSummen = useMemo(() => {
    const summeFlaeche = selectedEinheiten.reduce((sum, item) => sum + item.flaeche, 0);
    const summeMea = selectedEinheiten.reduce((sum, item) => sum + item.mea, 0);
    const summeVorauszahlung = selectedEinheiten.reduce(
      (sum, item) => sum + item.vorauszahlung,
      0,
    );

    return {
      summeFlaeche,
      summeMea,
      summeVorauszahlung,
    };
  }, [selectedEinheiten]);

  function getWegSollEinheitenForAbrechnung(
    abrechnung: NebenkostenAbrechnung | null,
  ): Abrechnungseinheit[] {
    if (!abrechnung) {
      return [];
    }

    return (
      createEinheitenFromObjektmodul(
        abrechnung.id,
        abrechnung.objektDisplayId,
        abrechnung.objektName,
        objectApartmentsByStorageId,
        objectTenanciesByStorageId,
        [],
        objectStorageKeyByDisplayId,
      ) ?? []
    );
  }

  const selectedWegSollEinheiten = useMemo(() => {
    return getWegSollEinheitenForAbrechnung(selectedAbrechnung);
  }, [
    objectApartmentsByStorageId,
    objectStorageKeyByDisplayId,
    objectTenanciesByStorageId,
    selectedAbrechnung,
  ]);

  const selectedObjectStorageKey = useMemo(() => {
    if (!selectedAbrechnung) {
      return "";
    }

    return (
      getObjectStorageKeyByDisplayId(
        selectedAbrechnung.objektDisplayId,
        objectStorageKeyByDisplayId,
      ) ?? ""
    );
  }, [objectStorageKeyByDisplayId, selectedAbrechnung]);

  const importedUtilitiesCount = useMemo(() => {
    if (!selectedObjectStorageKey) {
      return 0;
    }

    return objectUtilitiesByStorageId[selectedObjectStorageKey]?.length ?? 0;
  }, [objectUtilitiesByStorageId, selectedObjectStorageKey]);

  const importedEinheitenIds = useMemo(
    () => new Set(selectedWegSollEinheiten.map((item) => item.id)),
    [selectedWegSollEinheiten],
  );

  const importedEinheitenImArbeitsstand = useMemo(() => {
    return selectedEinheiten.filter((item) => importedEinheitenIds.has(item.id)).length;
  }, [importedEinheitenIds, selectedEinheiten]);

  const manuellErgaenzteEinheiten = useMemo(() => {
    return selectedEinheiten.filter((item) => !importedEinheitenIds.has(item.id)).length;
  }, [importedEinheitenIds, selectedEinheiten]);


  const aktivePositionen = useMemo(() => {
    return selectedPositionen.filter((item) => isPositionAktiv(item));
  }, [selectedPositionen]);

  const verteilungAktiverPositionen = useMemo(() => {
    return createVerteilungAktiverPositionen(selectedPositionen, selectedEinheiten);
  }, [selectedEinheiten, selectedPositionen]);

  const abschlusspruefung = useMemo(() => {
    return createAbschlusspruefung(
      selectedPositionen,
      selectedEinheiten,
      selectedWegSollEinheiten,
    );
  }, [selectedEinheiten, selectedPositionen, selectedWegSollEinheiten]);

  const abrechnungsergebnisJeEinheit = useMemo(() => {
    return createAbrechnungsergebnisJeEinheit(
      selectedEinheiten,
      verteilungAktiverPositionen,
    );
  }, [selectedEinheiten, verteilungAktiverPositionen]);

  const vorbereiteterReport = useMemo(() => {
    if (!selectedAbrechnung) return null;

    return createVorbereitetenReport(
      selectedAbrechnung,
      selectedPositionen,
      selectedEinheiten,
      false,
      selectedWegSollEinheiten,
    );
  }, [
    selectedAbrechnung,
    selectedEinheiten,
    selectedPositionen,
    selectedWegSollEinheiten,
  ]);

  const finalReportSnapshot = useMemo(() => {
    if (!selectedAbrechnungId) return null;
    return finalReportSnapshotsByAbrechnungId[selectedAbrechnungId] ?? null;
  }, [finalReportSnapshotsByAbrechnungId, selectedAbrechnungId]);

  const finalerReport = finalReportSnapshot?.report ?? null;
  const finalerEinzelreportBatch = useMemo(
    () => (finalerReport ? createEinzelreportTemplateData(finalerReport) : []),
    [finalerReport],
  );
  const finalerVermieterreportBatch = useMemo(
    () => (finalerReport ? createVermieterreportTemplateData(finalerReport) : []),
    [finalerReport],
  );
  const reportUebersicht = finalerReport ?? vorbereiteterReport;
  const reportIstFreigegeben = finalerReport !== null;
  const reportIstFreigabefaehig =
    vorbereiteterReport?.abschlusspruefung.istVollstaendig ?? false;
  const serverseitigFreigabefaehig = serverValidation?.isReadyForApproval ?? false;
  const freigabeBereit = reportIstFreigabefaehig && serverseitigFreigabefaehig;

  const selectedKatalogPosition = useMemo(() => {
    if (!katalogEditorId) return null;
    return (
      selectedPositionen.find(
        (item) => item.id === katalogEditorId && item.art !== "sonder",
      ) ?? null
    );
  }, [selectedPositionen, katalogEditorId]);

  const bearbeiteteSonderposition = useMemo(() => {
    if (!bearbeiteteSonderpositionId) return null;
    return (
      selectedPositionen.find(
        (item) => item.id === bearbeiteteSonderpositionId && item.art === "sonder",
      ) ?? null
    );
  }, [selectedPositionen, bearbeiteteSonderpositionId]);

  const offenePruefpunkte = useMemo(() => {
    return vorbereiteterReport?.abschlusspruefung.pruefpunkte.filter(
      (item) => !item.istErfuellt,
    ) ?? [];
  }, [vorbereiteterReport]);

  const correctionPositionen = useMemo(() => {
    if (aktivePositionen.length === 0) {
      return [...standardPositionen].sort((left, right) =>
        left.bezeichnung.localeCompare(right.bezeichnung, "de"),
      );
    }

    const bekannteEinheitenIds = new Set(selectedEinheiten.map((item) => item.id));
    const problemPositionIds = new Set<string>();

    selectedPositionen.forEach((position) => {
      if (position.art !== "sonder" && position.bewertungsstatus === "offen") {
        problemPositionIds.add(position.id);
      }

      if (!isPositionAktiv(position)) {
        return;
      }

      const direkteEinheitFehlt =
        position.verteilschluessel === "Direkt" &&
        (!position.direkteEinheitId ||
          !bekannteEinheitenIds.has(position.direkteEinheitId));

      const verteilungsZeile = verteilungAktiverPositionen.find(
        (row) => row.position.id === position.id,
      );

      const verteilungFehler =
        !!verteilungsZeile &&
        Math.abs(verteilungsZeile.offenerBetrag) > PRUEF_TOLERANZ;

      if (direkteEinheitFehlt || verteilungFehler) {
        problemPositionIds.add(position.id);
      }
    });

    return selectedPositionen
      .filter((position) => problemPositionIds.has(position.id))
      .sort((left, right) =>
        left.bezeichnung.localeCompare(right.bezeichnung, "de"),
      );
  }, [
    aktivePositionen.length,
    selectedEinheiten,
    selectedPositionen,
    standardPositionen,
    verteilungAktiverPositionen,
  ]);

  const correctionEinheiten = useMemo(() => {
    return [...selectedEinheiten].sort((left, right) =>
      left.einheit.localeCompare(right.einheit, "de"),
    );
  }, [selectedEinheiten]);

  const importstatusHinweis = useMemo(() => {
    if (!selectedAbrechnung) {
      return "";
    }

    if (!selectedObjectStorageKey) {
      return "Zum Objekt gibt es aktuell noch keine erkennbare Verknüpfung ins Objektmodul.";
    }

    if (selectedWegSollEinheiten.length === 0 && importedUtilitiesCount === 0) {
      return "Es wurden noch keine verwertbaren Einheiten oder Kostenarten aus dem Objektmodul gefunden.";
    }

    if (manuellErgaenzteEinheiten > 0) {
      return "Im Report gibt es zusätzliche Einheiten, die nicht direkt aus dem Objektmodul stammen.";
    }

    if (correctionPositionen.length > 0 || offenePruefpunkte.length > 0) {
      return "Die Stammdaten sind da, aber im Arbeitsstand gibt es noch Punkte zur Nachbearbeitung.";
    }

    return "Die aktuellen Stammdaten sind aus dem Objektmodul übernommen und im Report nutzbar.";
  }, [
    correctionPositionen.length,
    importedUtilitiesCount,
    manuellErgaenzteEinheiten,
    offenePruefpunkte.length,
    selectedAbrechnung,
    selectedObjectStorageKey,
    selectedWegSollEinheiten.length,
  ]);

  const summen = useMemo(() => {
    const summeGesamt = selectedPositionen.reduce((sum, item) => sum + item.betrag, 0);
    const summeUmlagefaehig = selectedPositionen
      .filter((item) => item.umlagefaehig)
      .reduce((sum, item) => sum + item.betrag, 0);
    const summeNichtUmlagefaehig = selectedPositionen
      .filter((item) => !item.umlagefaehig)
      .reduce((sum, item) => sum + item.betrag, 0);

    return {
      summeGesamt,
      summeUmlagefaehig,
      summeNichtUmlagefaehig,
    };
  }, [selectedPositionen]);

  const countInArbeit = gefilterteAbrechnungen.filter(
    (item) => item.status === "In Arbeit",
  ).length;
  const countArchiviert = gefilterteAbrechnungen.filter(
    (item) => item.status === "Archiviert",
  ).length;
  const selectedAbrechnungReportYear = selectedAbrechnung
    ? getReportYearFromAbrechnung(selectedAbrechnung)
    : null;
  const selectedNebenkostenDocuments = selectedAbrechnung
    ? documents.filter((document) =>
      document.category === "Nebenkostenabrechnung" &&
      document.objectName.toLowerCase().includes(selectedAbrechnung.objektDisplayId.toLowerCase()) &&
      (selectedAbrechnungReportYear === null || document.reportYear === selectedAbrechnungReportYear),
    )
    : [];
  const selectedJahresreports = selectedAbrechnung
    ? documents.filter((document) =>
      document.category === "Jahresreport WEG" &&
      document.objectName.toLowerCase().includes(selectedAbrechnung.objektDisplayId.toLowerCase()) &&
      (selectedAbrechnungReportYear === null || document.reportYear === selectedAbrechnungReportYear),
    )
    : [];
  const selectedOpenNebenkostenDocumentCount = selectedNebenkostenDocuments.filter((document) =>
    (document.openIssues?.length ?? 0) > 0 || document.actionState,
  ).length;

  const istArchiviert = selectedAbrechnung?.status === "Archiviert";

  function resetFilters() {
    setSuchtext("");
    setObjektFilter("ALLE");
    setReportYearFilter("ALLE");
    setStatusFilter("AKTIV");
  }

  function resetKatalogEditor() {
    setKatalogEditorId(null);
    setKatalogBetrag("");
    setKatalogVerteilschluessel("Direkt");
    setKatalogBewertungsstatus("offen");
    setKatalogDirekteEinheitId("");
  }

  function resetSonderpositionForm() {
    setBearbeiteteSonderpositionId(null);
    setSonderpositionForm(createEmptySonderpositionForm());
  }

  function resetEinheitEditor() {
    setEinheitEditorId(null);
    setEinheitVorauszahlung("");
  }

  function updateAbrechnungGeaendertAm(abrechnungId: string) {
    setAbrechnungen((prev) =>
      prev.map((entry) =>
        entry.id === abrechnungId
          ? { ...entry, geaendertAm: currentDateForDisplay() }
          : entry,
      ),
    );
  }

  function handleCreate(payload: VorbereiteteAbrechnung) {
    const nextId = `BKA-ENTWURF-${String(abrechnungen.length + 1).padStart(3, "0")}`;

    const neueAbrechnung: NebenkostenAbrechnung = {
      id: nextId,
      objektDisplayId: payload.objektDisplayId,
      objektName: payload.objektName,
      zeitraumVon: payload.zeitraumVon,
      zeitraumBis: payload.zeitraumBis,
      status: "In Arbeit",
      erstelltAm: currentDateForDisplay(),
      geaendertAm: currentDateForDisplay(),
    };

    const objektkostenstellenAusObjektmodul = getObjektkostenstellenAusObjektmodul(
      payload.objektDisplayId,
      objectUtilitiesByStorageId,
      objectStorageKeyByDisplayId,
    );

    const neuePositionen = objektkostenstellenAusObjektmodul
      ? createPositionenFromObjektmodul(
          nextId,
          objektkostenstellenAusObjektmodul,
          [],
        )
      : [];

    const neueEinheitenAusObjektmodul = createEinheitenFromObjektmodul(
      nextId,
      payload.objektDisplayId,
      payload.objektName,
      objectApartmentsByStorageId,
      objectTenanciesByStorageId,
      [],
      objectStorageKeyByDisplayId,
    );

    const neueEinheiten = neueEinheitenAusObjektmodul ?? [];

    setAbrechnungen((prev) => [neueAbrechnung, ...prev]);
    setPositionsByAbrechnungId((prev) => ({
      ...prev,
      [nextId]: neuePositionen,
    }));
    setEinheitenByAbrechnungId((prev) => ({
      ...prev,
      [nextId]: neueEinheiten,
    }));
    setSuchtext("");
    setObjektFilter("ALLE");
    setStatusFilter("AKTIV");
    setSelectedAbrechnungId(nextId);
    setDialogOpen(false);
  }

  async function handleAction(item: NebenkostenAbrechnung, action: AbrechnungAktion) {
    if (action === "Öffnen") {
      setSelectedAbrechnungId(item.id);
      return;
    }

    if (action === "Bearbeiten") {
      if (item.status === "Archiviert") return;
      setBearbeitenId(item.id);
      setBearbeitenOpen(true);
      return;
    }

    if (item.status === "Archiviert") return;

    const aktuellePositionen = positionsByAbrechnungId[item.id] ?? [];
    const aktuelleEinheiten = einheitenByAbrechnungId[item.id] ?? [];
    const pruefung = createAbschlusspruefung(
      aktuellePositionen,
      aktuelleEinheiten,
      getWegSollEinheitenForAbrechnung(item),
    );

    if (!pruefung.istVollstaendig) {
      setSelectedAbrechnungId(item.id);
      resetKatalogEditor();
      resetSonderpositionForm();
      return;
    }

    let approvalValidation: UtilityStatementValidationResponse | null = null;
    try {
      approvalValidation = await getUtilityStatementValidation(item.id);
      setServerValidation(approvalValidation);
    } catch {
      setWorkspaceSyncError(
        "Server-Validierung der Nebenkostenabrechnung ist fehlgeschlagen. Freigabe wurde abgebrochen.",
      );
      setSelectedAbrechnungId(item.id);
      return;
    }

    if (!approvalValidation.isReadyForApproval) {
      const blockedReasons = approvalValidation.issues.map((issue) => issue.message).join(" | ");
      setWorkspaceSyncError(
        blockedReasons.trim() === ""
          ? "Server-Validierung meldet offene Punkte. Freigabe abgebrochen."
          : `Freigabe abgebrochen: ${blockedReasons}`,
      );
      setSelectedAbrechnungId(item.id);
      resetKatalogEditor();
      resetSonderpositionForm();
      return;
    }

    const heute = currentDateForDisplay();
    const archivierteAbrechnung: NebenkostenAbrechnung = {
      ...item,
      status: "Archiviert",
      positivGeprueftAm: heute,
      geaendertAm: heute,
    };
    const finalReportSnapshot = createFinalReportSnapshot(
      archivierteAbrechnung,
      aktuellePositionen,
      aktuelleEinheiten,
      getWegSollEinheitenForAbrechnung(archivierteAbrechnung),
    );

    try {
      const approvedSettlement = await approveUtilityStatement(
        item.id,
        buildSettlementPayload(item, {
          status: "Archiviert",
          geaendertAm: heute,
          positivGeprueftAm: heute,
          finalReportSnapshot,
        }),
      );

      setFinalReportSnapshotsByAbrechnungId((prev) => ({
        ...prev,
        [item.id]:
          approvedSettlement.finalReportSnapshot &&
          typeof approvedSettlement.finalReportSnapshot === "object"
            ? (approvedSettlement.finalReportSnapshot as FinalReportSnapshot)
            : finalReportSnapshot,
      }));
      setAbrechnungen((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? mapWorkspaceSettlementToAbrechnung(approvedSettlement) : entry,
        ),
      );
      setWorkspaceSyncError(null);
      setServerValidation((prev) =>
        prev
          ? { ...prev, isReadyForApproval: true, issues: [] }
          : {
              isReadyForApproval: true,
              issues: [],
              metrics: {
                activePositionsCount: aktuellePositionen.filter((entry) => entry.betrag > 0).length,
                unitsCount: aktuelleEinheiten.length,
                totalAmount: roundToCents(
                  aktuellePositionen.reduce((sum, entry) => sum + entry.betrag, 0),
                ),
                totalAdvancePayments: roundToCents(
                  aktuelleEinheiten.reduce((sum, entry) => sum + entry.vorauszahlung, 0),
                ),
              },
            },
      );
      setSelectedAbrechnungId(item.id);
      resetKatalogEditor();
      resetSonderpositionForm();
    } catch (error) {
      setWorkspaceSyncError(
        error instanceof Error && error.message.trim() !== ""
          ? error.message
          : "Nebenkosten-Freigabe konnte nicht serverseitig gespeichert werden.",
      );
    }
  }

  function handleSaveEdit(payload: NebenkostenAbrechnung) {
    setAbrechnungen((prev) =>
      prev.map((entry) => (entry.id === payload.id ? payload : entry)),
    );
    setSelectedAbrechnungId(payload.id);
    setBearbeitenOpen(false);
    setBearbeitenId(null);
  }

  function handleCloseEdit() {
    setBearbeitenOpen(false);
    setBearbeitenId(null);
  }

  function handleStartKatalogBearbeiten(position: AbrechnungsPosition) {
    if (!selectedAbrechnung) return;
    if (selectedAbrechnung.status === "Archiviert") return;

    setKatalogEditorId(position.id);
    setKatalogBetrag(formatNumberForInput(position.betrag));
    setKatalogVerteilschluessel(position.verteilschluessel);
    setKatalogBewertungsstatus(position.bewertungsstatus);
    setKatalogDirekteEinheitId(position.direkteEinheitId ?? "");
  }

  function handleSaveKatalogBetrag() {
    if (!selectedAbrechnung) return;
    if (!selectedKatalogPosition) return;
    if (selectedAbrechnung.status === "Archiviert") return;

    const betrag = Number(katalogBetrag.replace(",", "."));

    if (!Number.isFinite(betrag) || betrag < 0) {
      return;
    }

    setPositionsByAbrechnungId((prev) => {
      const aktuellePositionen = prev[selectedAbrechnung.id] ?? [];
      return {
        ...prev,
        [selectedAbrechnung.id]: aktuellePositionen.map((item) =>
          item.id === selectedKatalogPosition.id
            ? {
                ...item,
                betrag,
                verteilschluessel: katalogVerteilschluessel,
                direkteEinheitId:
                  katalogVerteilschluessel === "Direkt"
                    ? katalogDirekteEinheitId || null
                    : null,
                bewertungsstatus:
                  betrag > 0 ? "erfasst" : katalogBewertungsstatus,
              }
            : item,
        ),
      };
    });

    updateAbrechnungGeaendertAm(selectedAbrechnung.id);
    resetKatalogEditor();
  }

  function handleStartSonderpositionBearbeiten(position: AbrechnungsPosition) {
    if (!selectedAbrechnung) return;
    if (selectedAbrechnung.status === "Archiviert") return;

    setBearbeiteteSonderpositionId(position.id);
    setSonderpositionForm({
      bezeichnung: position.bezeichnung,
      betrag: formatNumberForInput(position.betrag),
      umlagefaehig: position.umlagefaehig,
      verteilschluessel: position.verteilschluessel,
      direkteEinheitId: position.direkteEinheitId ?? "",
    });
  }

  function handleSaveSonderposition() {
    if (!selectedAbrechnung) return;
    if (selectedAbrechnung.status === "Archiviert") return;

    const betrag = Number(sonderpositionForm.betrag.replace(",", "."));

    if (
      sonderpositionForm.bezeichnung.trim() === "" ||
      !Number.isFinite(betrag) ||
      betrag <= 0
    ) {
      return;
    }

    if (bearbeiteteSonderpositionId) {
      setPositionsByAbrechnungId((prev) => {
        const aktuellePositionen = prev[selectedAbrechnung.id] ?? [];
        return {
          ...prev,
          [selectedAbrechnung.id]: aktuellePositionen.map((item) =>
            item.id === bearbeiteteSonderpositionId
              ? {
                  ...item,
                  bezeichnung: sonderpositionForm.bezeichnung.trim(),
                  betrag,
                  umlagefaehig: sonderpositionForm.umlagefaehig,
                  verteilschluessel: sonderpositionForm.verteilschluessel,
                  direkteEinheitId:
                    sonderpositionForm.verteilschluessel === "Direkt"
                      ? sonderpositionForm.direkteEinheitId || null
                      : null,
                  bewertungsstatus: betrag > 0 ? "erfasst" : "offen",
                }
              : item,
          ),
        };
      });

      updateAbrechnungGeaendertAm(selectedAbrechnung.id);
      resetSonderpositionForm();
      return;
    }

    const neueSonderposition: AbrechnungsPosition = {
      id: `SONDER-${Date.now()}`,
      bezeichnung: sonderpositionForm.bezeichnung.trim(),
      kostenart: "Sonderposition",
      betrag,
      umlagefaehig: sonderpositionForm.umlagefaehig,
      verteilschluessel: sonderpositionForm.verteilschluessel,
      direkteEinheitId:
        sonderpositionForm.verteilschluessel === "Direkt"
          ? sonderpositionForm.direkteEinheitId || null
          : null,
      erfasstAm: currentDateForDisplay(),
      art: "sonder",
      bewertungsstatus: "erfasst",
    };

    setPositionsByAbrechnungId((prev) => {
      const aktuellePositionen = prev[selectedAbrechnung.id] ?? [];
      return {
        ...prev,
        [selectedAbrechnung.id]: [...aktuellePositionen, neueSonderposition],
      };
    });

    updateAbrechnungGeaendertAm(selectedAbrechnung.id);
    resetSonderpositionForm();
  }

  function handleDeleteSonderposition(positionId: string) {
    if (!selectedAbrechnung) return;
    if (selectedAbrechnung.status === "Archiviert") return;

    setPositionsByAbrechnungId((prev) => {
      const aktuellePositionen = prev[selectedAbrechnung.id] ?? [];
      return {
        ...prev,
        [selectedAbrechnung.id]: aktuellePositionen.filter(
          (item) => item.id !== positionId,
        ),
      };
    });

    updateAbrechnungGeaendertAm(selectedAbrechnung.id);

    if (bearbeiteteSonderpositionId === positionId) {
      resetSonderpositionForm();
    }
  }


  function handleStartEinheitBearbeiten(einheit: Abrechnungseinheit) {
    if (!selectedAbrechnung) return;
    if (selectedAbrechnung.status === "Archiviert") return;

    setEinheitEditorId(einheit.id);
    setEinheitVorauszahlung(formatNumberForInput(einheit.vorauszahlung));
  }

  function handleSaveEinheitVorauszahlung() {
    if (!selectedAbrechnung) return;
    if (!einheitEditorId) return;
    if (selectedAbrechnung.status === "Archiviert") return;

    const vorauszahlung = Number(einheitVorauszahlung.replace(",", "."));

    if (!Number.isFinite(vorauszahlung) || vorauszahlung < 0) {
      return;
    }

    setEinheitenByAbrechnungId((prev) => {
      const aktuelleEinheiten = prev[selectedAbrechnung.id] ?? [];
      return {
        ...prev,
        [selectedAbrechnung.id]: aktuelleEinheiten.map((item) =>
          item.id === einheitEditorId ? { ...item, vorauszahlung } : item,
        ),
      };
    });

    updateAbrechnungGeaendertAm(selectedAbrechnung.id);
    resetEinheitEditor();
  }

  function handleRestoreEinheiten() {
    if (!selectedAbrechnung) return;
    if (selectedAbrechnung.status === "Archiviert") return;

    const einheitenAusObjektmodul = createEinheitenFromObjektmodul(
      selectedAbrechnung.id,
      selectedAbrechnung.objektDisplayId,
      selectedAbrechnung.objektName,
      objectApartmentsByStorageId,
      objectTenanciesByStorageId,
      [],
      objectStorageKeyByDisplayId,
    );

    setEinheitenByAbrechnungId((prev) => ({
      ...prev,
      [selectedAbrechnung.id]: einheitenAusObjektmodul ?? [],
    }));

    updateAbrechnungGeaendertAm(selectedAbrechnung.id);
    resetEinheitEditor();
  }

  return (
    <div className="space-y-6">
      {workspaceSyncError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {workspaceSyncError}
        </div>
      ) : null}
      {listSyncError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {listSyncError}
        </div>
      ) : null}
      {selectedAbrechnung && reportUebersicht ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Arbeitsblock
              </p>
              <h4 className="mt-2 text-2xl font-semibold text-zinc-900">
                {selectedAbrechnung.objektName}
              </h4>
              <p className="mt-2 text-sm text-zinc-600">
                {selectedAbrechnung.zeitraumVon} - {selectedAbrechnung.zeitraumBis}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <StatusPill tone={istArchiviert ? "dark" : "amber"}>
                {selectedAbrechnung.status}
              </StatusPill>
              <StatusPill>
                {reportUebersicht.metadaten.aktivePositionenCount} aktive Positionen
              </StatusPill>
              <StatusPill>
                {reportUebersicht.metadaten.einheitenCount} Einheiten
              </StatusPill>
              <StatusPill
                tone={
                  reportIstFreigegeben || reportIstFreigabefaehig ? "dark" : "amber"
                }
              >
                {reportIstFreigegeben
                  ? "Report freigegeben"
                  : reportIstFreigabefaehig
                    ? "Freigabebereit"
                    : "Fehler vorhanden"}
              </StatusPill>
              <button
                type="button"
                onClick={() => {
                  if (selectedAbrechnung.status === "Archiviert") return;
                  setBearbeitenId(selectedAbrechnung.id);
                  setBearbeitenOpen(true);
                }}
                disabled={istArchiviert}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
              >
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => handleAction(selectedAbrechnung, "Positiv geprüft")}
                disabled={istArchiviert || !freigabeBereit}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
              >
                Positiv prüfen
              </button>
              <Link
                href={buildNebenkostenDocumentsHref(selectedAbrechnung, "Nebenkostenabrechnung")}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                Abrechnungsdokumente
              </Link>
              <Link
                href={buildNebenkostenDocumentsHref(selectedAbrechnung, "Jahresreport WEG")}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                Jahresreports
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Dokumentenpfad
              </p>
              <p className="mt-2 text-base font-semibold text-zinc-900">
                {selectedNebenkostenDocuments.length} Nebenkostenabrechnungen
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {selectedOpenNebenkostenDocumentCount} offene Dokumentfälle im Ablagepfad
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Jahresreports
              </p>
              <p className="mt-2 text-base font-semibold text-zinc-900">
                {selectedJahresreports.length} Reports zum Berichtsjahr
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Grundlage für Objektjahresstand und spätere Nachweise
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Berichtsjahr
              </p>
              <p className="mt-2 text-base font-semibold text-zinc-900">
                {selectedAbrechnungReportYear ?? "Ohne Jahr"}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Dokumentlinks öffnen direkt den passenden Jahreskontext
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Freigabestand
                </p>
                <h5 className="mt-2 text-lg font-semibold text-zinc-900">
                  {reportIstFreigegeben
                    ? "Report freigegeben"
                    : freigabeBereit
                      ? "Freigabe möglich"
                      : "Prüfung offen"}
                </h5>
                <p className="mt-2 text-sm text-zinc-600">
                  Der finale Report bleibt bis zur positiven Prüfung ausgeblendet und basiert danach ausschließlich auf dem freigegebenen Datenstand.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusPill>
                  {vorbereiteterReport?.abschlusspruefung.pruefpunkte.length ?? 0} Prüfpunkte
                </StatusPill>
                <StatusPill>
                  {vorbereiteterReport?.metadaten.problemCount ?? 0} offen
                </StatusPill>
                <StatusPill>
                  {serverValidation?.isReadyForApproval ? "Server prüfbar" : "Server prüft"}
                </StatusPill>
              </div>
            </div>

            {reportIstFreigegeben ? (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-900">
                  Der finale Report ist freigegeben und vom laufenden Arbeitsstand getrennt.
                </p>
              </div>
            ) : freigabeBereit ? (
              <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
                <p className="text-sm font-medium text-teal-900">
                  Die Prüfung ist abgeschlossen. Mit „Positiv prüfen“ wird der finale Report freigegeben.
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">
                  Fehler vorhanden. Solange Probleme offen sind, bleibt der Report ausgeblendet.
                </p>
                {serverValidation && serverValidation.issues.length > 0 ? (
                  <div className="mt-3 space-y-2 text-sm text-amber-900">
                    {serverValidation.issues.map((issue) => (
                      <p key={issue.code}>- {issue.message}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-sky-700">
                    Stammdaten aus Objektmodul
                  </p>
                  <h5 className="mt-2 text-base font-semibold text-zinc-900">
                    Importstatus für diesen Report
                  </h5>
                  <p className="mt-1 text-sm text-zinc-700">{importstatusHinweis}</p>
                </div>

                <StatusPill tone={selectedObjectStorageKey ? "blue" : "amber"}>
                  {selectedObjectStorageKey ? "Objektmodul verbunden" : "Objektmodul offen"}
                </StatusPill>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-white/80 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Einheiten importiert
                  </p>
                  <p className="mt-2 text-xl font-semibold text-zinc-900">
                    {selectedWegSollEinheiten.length}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {importedEinheitenImArbeitsstand} im Report aktiv
                  </p>
                </div>

                <div className="rounded-xl border border-white/80 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Kostenarten aus Objektmodul
                  </p>
                  <p className="mt-2 text-xl font-semibold text-zinc-900">
                    {importedUtilitiesCount}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {selectedPositionen.filter((item) => item.art !== "sonder").length} Positionen im Arbeitsstand
                  </p>
                </div>

                <div className="rounded-xl border border-white/80 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Einheiten nur im Report
                  </p>
                  <p className="mt-2 text-xl font-semibold text-zinc-900">
                    {manuellErgaenzteEinheiten}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    nicht aus dem Objektmodul übernommen
                  </p>
                </div>

                <div className="rounded-xl border border-white/80 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Noch offen
                  </p>
                  <p className="mt-2 text-xl font-semibold text-zinc-900">
                    {offenePruefpunkte.length}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {correctionPositionen.length} Positionen mit Nacharbeit, {offenePruefpunkte.length} Prüfpunkte
                  </p>
                </div>
              </div>
            </div>
          </div>

          {!reportIstFreigegeben ? (
            <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Problemliste
                </p>
                <h5 className="mt-2 text-lg font-semibold text-zinc-900">
                  Nur blockierende Punkte
                </h5>
                <p className="mt-2 text-sm text-zinc-600">
                  Angezeigt werden nur fachliche Probleme, die den Abschluss blockieren.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {offenePruefpunkte.length === 0 ? (
                  <div className="rounded-2xl border border-teal-200 bg-white p-4">
                    <p className="text-sm font-medium text-zinc-900">
                      Keine blockierenden Punkte mehr offen.
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Der finale Report wird mit „Positiv prüfen“ freigegeben.
                    </p>
                  </div>
                ) : (
                  offenePruefpunkte.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-amber-300 bg-white p-4"
                    >
                      <p className="text-sm font-medium text-zinc-900">{item.label}</p>
                      {item.hinweis ? (
                        <p className="mt-1 text-sm text-zinc-600">{item.hinweis}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Korrekturansicht
                    </p>
                    <h6 className="mt-2 text-base font-semibold text-zinc-900">
                      Blockierende Punkte direkt korrigieren
                    </h6>
                    <p className="mt-1 text-sm text-zinc-600">
                      Hier korrigierst du nur die Objektkostenstellen aus dem Objektmodul sowie die blockierenden Einheitenwerte.
                    </p>
                  </div>

                  {correctionEinheiten.length === 0 ? (
                    <button
                      type="button"
                      onClick={handleRestoreEinheiten}
                      disabled={istArchiviert}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
                    >
                      Einheiten wiederherstellen
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Positionen
                    </p>
                    {correctionPositionen.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
                        Keine positionsbezogenen Korrekturen offen.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {correctionPositionen.map((position) => {
                          const isKatalogEditing = selectedKatalogPosition?.id === position.id;
                          const isSonderEditing = bearbeiteteSonderposition?.id === position.id;
                          const isEditing = isKatalogEditing || isSonderEditing;

                          return (
                            <div
                              key={position.id}
                              className="rounded-xl border border-zinc-200 bg-white p-3"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-zinc-900">
                                    {position.bezeichnung}
                                  </p>
                                  <p className="mt-1 text-sm text-zinc-600">
                                    Bewertung {getBewertungsstatusLabel(position.bewertungsstatus)} · Betrag {formatCurrency(position.betrag)} · Schlüssel {position.verteilschluessel}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    resetEinheitEditor();

                                    if (position.art === "sonder") {
                                      handleStartSonderpositionBearbeiten(position);
                                      resetKatalogEditor();
                                      return;
                                    }

                                    handleStartKatalogBearbeiten(position);
                                    resetSonderpositionForm();
                                  }}
                                  disabled={istArchiviert}
                                  className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
                                >
                                  Korrigieren
                                </button>
                              </div>

                              {isEditing ? (
                                <div className="mt-3 grid gap-3 md:grid-cols-[140px_120px_140px_minmax(0,1fr)_auto]">
                                  {isSonderEditing ? null : (
                                    <label className="space-y-1">
                                      <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                                        Bewertung
                                      </span>
                                      <select
                                        value={katalogBewertungsstatus}
                                        onChange={(event) =>
                                          setKatalogBewertungsstatus(
                                            event.target.value as Bewertungsstatus,
                                          )
                                        }
                                        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                                      >
                                        {bewertungsstatusOptionen.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  )}

                                  <label className="space-y-1">
                                    <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                                      Betrag
                                    </span>
                                    <input
                                      value={isSonderEditing ? sonderpositionForm.betrag : katalogBetrag}
                                      onChange={(event) =>
                                        isSonderEditing
                                          ? setSonderpositionForm((prev) => ({
                                              ...prev,
                                              betrag: event.target.value,
                                            }))
                                          : setKatalogBetrag(event.target.value)
                                      }
                                      placeholder="0,00"
                                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                                    />
                                  </label>

                                  <label className="space-y-1">
                                    <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                                      Schlüssel
                                    </span>
                                    <select
                                      value={
                                        isSonderEditing
                                          ? sonderpositionForm.verteilschluessel
                                          : katalogVerteilschluessel
                                      }
                                      onChange={(event) =>
                                        isSonderEditing
                                          ? setSonderpositionForm((prev) => ({
                                              ...prev,
                                              verteilschluessel: event.target.value as Verteilschluessel,
                                            }))
                                          : setKatalogVerteilschluessel(
                                              event.target.value as Verteilschluessel,
                                            )
                                      }
                                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                                    >
                                      {verteilschluesselOptionen.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  {(isSonderEditing
                                    ? sonderpositionForm.verteilschluessel === "Direkt"
                                    : katalogVerteilschluessel === "Direkt") ? (
                                    <label className="space-y-1">
                                      <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                                        Direkt-Einheit
                                      </span>
                                      <select
                                        value={
                                          isSonderEditing
                                            ? sonderpositionForm.direkteEinheitId
                                            : katalogDirekteEinheitId
                                        }
                                        onChange={(event) =>
                                          isSonderEditing
                                            ? setSonderpositionForm((prev) => ({
                                                ...prev,
                                                direkteEinheitId: event.target.value,
                                              }))
                                            : setKatalogDirekteEinheitId(event.target.value)
                                        }
                                        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                                      >
                                        <option value="">Einheit wählen</option>
                                        {selectedEinheiten.map((einheit) => (
                                          <option key={einheit.id} value={einheit.id}>
                                            {einheit.einheit} · {einheit.eigentuemer}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  ) : (
                                    <div className="hidden md:block" />
                                  )}

                                  <div className="flex items-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        isSonderEditing
                                          ? handleSaveSonderposition()
                                          : handleSaveKatalogBetrag()
                                      }
                                      disabled={istArchiviert}
                                      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
                                    >
                                      Speichern
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        resetKatalogEditor();
                                        resetSonderpositionForm();
                                      }}
                                      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-700"
                                    >
                                      Abbrechen
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Einheiten
                    </p>

                    {correctionEinheiten.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
                        Keine Einheiten vorhanden.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {correctionEinheiten.map((einheit) => {
                          const isEditing = einheitEditorId === einheit.id;

                          return (
                            <div
                              key={einheit.id}
                              className="rounded-xl border border-zinc-200 bg-white p-3"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-zinc-900">
                                    {einheit.einheit}
                                  </p>
                                  <p className="mt-1 text-sm text-zinc-600">
                                    Vorauszahlung {formatCurrency(einheit.vorauszahlung)}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    resetKatalogEditor();
                                    resetSonderpositionForm();
                                    handleStartEinheitBearbeiten(einheit);
                                  }}
                                  disabled={istArchiviert}
                                  className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
                                >
                                  Korrigieren
                                </button>
                              </div>

                              {isEditing ? (
                                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                                  <label className="space-y-1">
                                    <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                                      Vorauszahlung
                                    </span>
                                    <input
                                      value={einheitVorauszahlung}
                                      onChange={(event) =>
                                        setEinheitVorauszahlung(event.target.value)
                                      }
                                      placeholder="0,00"
                                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                                    />
                                  </label>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={handleSaveEinheitVorauszahlung}
                                      disabled={istArchiviert}
                                      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
                                    >
                                      Speichern
                                    </button>
                                    <button
                                      type="button"
                                      onClick={resetEinheitEditor}
                                      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-700"
                                    >
                                      Abbrechen
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {reportIstFreigegeben && finalerReport ? (
            <section className="mt-6 space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Report
                </p>
                <h5 className="mt-2 text-lg font-semibold text-zinc-900">
                  Finale Ausgabe für Mailversand und Einzelreports
                </h5>
                <p className="mt-2 text-sm text-zinc-600">
                  Der finale Report wird pro Wohnung / Einheit als eigenes Anschreiben mit Detailabrechnung dargestellt und basiert ausschließlich auf dem freigegebenen Stand.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    printElementBySelector("#finaler-report-batch", "Nebenkostenabrechnungen")
                  }
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition"
                >
                  🖨 Alle drucken
                </button>
              </div>
              {finalerEinzelreportBatch.length > 0 ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Einzelreport als PDF
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {finalerEinzelreportBatch.map((report) => (
                      <button
                        type="button"
                        key={report.reportId}
                        onClick={() =>
                          printReportById(
                            report.reportId,
                            `Nebenkostenabrechnung ${report.einheitName}`,
                          )
                        }
                        className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        PDF {report.einheitName}
                      </button>
                    ))}
                  </div>
                  {finalerVermieterreportBatch.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {finalerVermieterreportBatch.map((report) => (
                        <button
                          type="button"
                          key={report.reportId}
                          onClick={() =>
                            printOwnerReportById(report.reportId, `Vermieterreport ${report.eigentuemerName}`)
                          }
                          className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          PDF Vermieter {report.eigentuemerName}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div id="finaler-report-batch">
                <NebenkostenEinzelreportBatch reports={finalerEinzelreportBatch} />
                {finalerVermieterreportBatch.map((report) => (
                  <NebenkostenVermieterreportTemplate
                    key={`${report.objektName}-${report.eigentuemerName}`}
                    data={report}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Abrechnungen
            </p>
            <h3 className="mt-2 text-xl font-semibold text-zinc-900">
              Nebenkostenabrechnungen
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
              Neue Vorgänge starten in Arbeit. Nach positiver Prüfung werden sie sofort archiviert.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800"
            >
              Filter zurücksetzen
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 px-4 text-sm font-medium text-zinc-800"
            >
              BKA aus Vorjahr erstellen
            </button>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-medium text-white"
            >
              Neue Abrechnung erstellen
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_240px_180px_220px]">
          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Suche
            </span>
            <input
              value={suchtext}
              onChange={(event) => setSuchtext(event.target.value)}
              placeholder="Objekt oder Abrechnungs-ID suchen..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Objekt
            </span>
            <select
              value={objektFilter}
              onChange={(event) => setObjektFilter(event.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
            >
              <option value="ALLE">Alle Objekte</option>
              {objektOptionen.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Jahr
            </span>
            <select
              value={reportYearFilter}
              onChange={(event) => setReportYearFilter(event.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
            >
              <option value="ALLE">Alle Jahre</option>
              {reportYearOptionen.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
            >
              <option value="AKTIV">Aktive Vorgänge</option>
              <option value="ALLE">Alle</option>
              <option value="In Arbeit">In Arbeit</option>
              <option value="Archiviert">Archiviert</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <StatusPill tone="dark">{gefilterteAbrechnungen.length} Treffer</StatusPill>
          <StatusPill tone="amber">{countInArbeit} In Arbeit</StatusPill>
          <StatusPill>{countArchiviert} Archiviert</StatusPill>
        </div>
      </section>

      <NeueAbrechnungDialog
        open={dialogOpen}
        objekte={auswahlObjekte}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />

      <BearbeitenAbrechnungDialog
        open={bearbeitenOpen}
        item={abrechnungZumBearbeiten}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
      />
    </div>
  );

}
