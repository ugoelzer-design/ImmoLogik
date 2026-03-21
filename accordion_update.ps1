$path = "C:\Users\ugoel\immologik\apps\web\features\finances\components\NebenkostenAbrechnungen.tsx"
$backupPath = "$path.bak_accordion_20260311"

if (-not (Test-Path $path)) {
  throw "Datei nicht gefunden: $path"
}

Copy-Item -Path $path -Destination $backupPath -Force

@'
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  beispielAbrechnungen,
  beispielObjekte,
  kostenarten,
} from "../data/nebenkosten";
import { BearbeitenAbrechnungDialog } from "./dialogs/BearbeitenAbrechnungDialog";
import { NeueAbrechnungDialog } from "./dialogs/NeueAbrechnungDialog";
import { AbrechnungDetailPanel } from "./panels/AbrechnungDetailPanel";
import { AbrechnungRow } from "./rows/AbrechnungRow";
import { StatusPill } from "./shared/StatusPill";
import { currentDateForDisplay } from "../utils/nebenkosten-format";
import type {
  AbrechnungAktion,
  NebenkostenAbrechnung,
  StatusFilter,
  VorbereiteteAbrechnung,
} from "../types/nebenkosten";

type PositionArt = "standard" | "optional" | "sonder";
type Verteilschluessel = "MEA" | "Fläche" | "Einheit" | "Direkt";

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
  vorauszahlung: number;
};

const verteilschluesselOptionen: Verteilschluessel[] = [
  "MEA",
  "Fläche",
  "Einheit",
  "Direkt",
];

const PRUEF_TOLERANZ = 0.01;

const standardKostenarten = kostenarten.filter((item) => item.aktivDefault);
const optionaleKostenarten = kostenarten.filter((item) => !item.aktivDefault);

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

type DetailSectionKey =
  | "abschlusspruefung"
  | "standardkostenarten"
  | "optionaleKostenarten"
  | "sonderpositionen"
  | "abrechnungseinheiten"
  | "verteilung"
  | "ergebnis";

const defaultOpenSections: Record<DetailSectionKey, boolean> = {
  abschlusspruefung: true,
  standardkostenarten: false,
  optionaleKostenarten: false,
  sonderpositionen: false,
  abrechnungseinheiten: false,
  verteilung: false,
  ergebnis: true,
};

type DetailAccordionSectionProps = {
  sectionKey: DetailSectionKey;
  isOpen: boolean;
  onToggle: (sectionKey: DetailSectionKey) => void;
  eyebrow: string;
  title: string;
  description?: string;
  badges?: any;
  sectionClassName: string;
  children?: any;
};

function DetailAccordionSection({
  sectionKey,
  isOpen,
  onToggle,
  eyebrow,
  title,
  description,
  badges,
  sectionClassName,
  children,
}: DetailAccordionSectionProps) {
  return (
    <section className={sectionClassName}>
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="flex w-full flex-col gap-3 text-left md:flex-row md:items-start md:justify-between"
      >
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">{eyebrow}</p>
          <h5 className="mt-2 text-lg font-semibold text-zinc-900">{title}</h5>
          {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {badges}
          <span className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800">
            {isOpen ? "Einklappen" : "Ausklappen"}
          </span>
        </div>
      </button>

      {isOpen ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

function createVerteilungAktiverPositionen(
  positionen: AbrechnungsPosition[],
  einheiten: Abrechnungseinheit[],
): VerteilungsZeile[] {
  const aktivePositionen = positionen.filter((item) => isPositionAktiv(item));
  const gesamtMea = einheiten.reduce((sum, item) => sum + item.mea, 0);
  const gesamtFlaeche = einheiten.reduce((sum, item) => sum + item.flaeche, 0);

  return aktivePositionen.map((position) => {
    const verteilungJeEinheit = einheiten.map((einheit) => {
      let anteil = 0;
      let basis = "";

      if (position.verteilschluessel === "MEA") {
        anteil = gesamtMea > 0 ? (position.betrag * einheit.mea) / gesamtMea : 0;
        basis = `${einheit.mea} / ${gesamtMea} MEA`;
      }

      if (position.verteilschluessel === "Fläche") {
        anteil =
          gesamtFlaeche > 0 ? (position.betrag * einheit.flaeche) / gesamtFlaeche : 0;
        basis = `${einheit.flaeche.toFixed(2)} / ${gesamtFlaeche.toFixed(2)} m²`;
      }

      if (position.verteilschluessel === "Einheit") {
        anteil = einheiten.length > 0 ? position.betrag / einheiten.length : 0;
        basis = `1 / ${einheiten.length} Einheit`;
      }

      if (position.verteilschluessel === "Direkt") {
        anteil = position.direkteEinheitId === einheit.id ? position.betrag : 0;

        if (position.direkteEinheitId === einheit.id) {
          basis = `Direkt auf ${einheit.einheit}`;
        }

        if (position.direkteEinheitId && position.direkteEinheitId !== einheit.id) {
          basis = "Direkt auf andere Einheit";
        }

        if (!position.direkteEinheitId) {
          basis = "Direkte Zuordnung fehlt";
        }
      }

      return {
        id: einheit.id,
        einheit: einheit.einheit,
        eigentuemer: einheit.eigentuemer,
        basis,
        anteil,
      };
    });

    const verteilteSumme = verteilungJeEinheit.reduce((sum, item) => sum + item.anteil, 0);
    const differenz = Math.abs(position.betrag - verteilteSumme);

    return {
      position,
      verteilungJeEinheit,
      verteilteSumme,
      offenerBetrag: differenz <= PRUEF_TOLERANZ ? 0 : differenz,
    };
  });
}

function createAbschlusspruefung(
  positionen: AbrechnungsPosition[],
  einheiten: Abrechnungseinheit[],
): Abschlusspruefung {
  const aktivePositionen = positionen.filter((item) => isPositionAktiv(item));
  const verteilungAktiverPositionen = createVerteilungAktiverPositionen(positionen, einheiten);
  const bekannteEinheitenIds = new Set(einheiten.map((item) => item.id));

  const aktivePositionenOhneVerteilschluessel = aktivePositionen.filter(
    (item) => String(item.verteilschluessel ?? "").trim() === "",
  );

  const direktePositionenOhneEinheit = aktivePositionen.filter(
    (item) =>
      item.verteilschluessel === "Direkt" &&
      (!item.direkteEinheitId || !bekannteEinheitenIds.has(item.direkteEinheitId)),
  );

  const einheitenOhneVorauszahlung = einheiten.filter(
    (item) => !Number.isFinite(item.vorauszahlung),
  );

  const unvollstaendigVerteiltePositionen = verteilungAktiverPositionen.filter(
    (row) => Math.abs(row.position.betrag - row.verteilteSumme) > PRUEF_TOLERANZ,
  );

  const pruefpunkte: Pruefpunkt[] = [
    {
      id: "aktive-position",
      label: "Mindestens 1 aktive Position vorhanden",
      istErfuellt: aktivePositionen.length > 0,
      hinweis: "Mindestens eine aktive Position mit Betrag größer 0 ist erforderlich.",
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






function createKatalogPosition(
  abrechnungId: string,
  item: (typeof kostenarten)[number],
  betragOverride?: number,
): AbrechnungsPosition {
  return {
    id: `${abrechnungId}__${item.aktivDefault ? "STD" : "OPT"}__${item.id}`,
    bezeichnung: item.name,
    kostenart: item.name,
    betrag: betragOverride ?? 0,
    umlagefaehig: item.umlagefaehigMieter,
    verteilschluessel: mapStandardSchluesselToKurzform(item.standardSchluessel),
    direkteEinheitId: null,
    erfasstAm: currentDateForDisplay(),
    art: item.aktivDefault ? "standard" : "optional",
  };
}

function createInitialPositionenForAbrechnung(abrechnungId: string): AbrechnungsPosition[] {
  const betragOverrides = initialBetragOverridesByAbrechnungId[abrechnungId] ?? {};
  const katalogPositionen = kostenarten.map((item) =>
    createKatalogPosition(abrechnungId, item, betragOverrides[item.name]),
  );
  const sonderpositionen = initialSonderpositionenByAbrechnungId[abrechnungId] ?? [];

  return [...katalogPositionen, ...sonderpositionen];
}

function createInitialPositionsState(): Record<string, AbrechnungsPosition[]> {
  const result: Record<string, AbrechnungsPosition[]> = {};

  beispielAbrechnungen.forEach((abrechnung) => {
    result[abrechnung.id] = createInitialPositionenForAbrechnung(abrechnung.id);
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

export function NebenkostenAbrechnungen() {
  const [abrechnungen, setAbrechnungen] =
    useState<NebenkostenAbrechnung[]>(beispielAbrechnungen);
  const [suchtext, setSuchtext] = useState("");
  const [objektFilter, setObjektFilter] = useState("ALLE");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("AKTIV");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bearbeitenOpen, setBearbeitenOpen] = useState(false);
  const [selectedAbrechnungId, setSelectedAbrechnungId] = useState<string | null>(
    beispielAbrechnungen[0]?.id ?? null,
  );
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [positionsByAbrechnungId, setPositionsByAbrechnungId] = useState<
    Record<string, AbrechnungsPosition[]>
  >(() => createInitialPositionsState());
  const [einheitenByAbrechnungId, setEinheitenByAbrechnungId] = useState<
    Record<string, Abrechnungseinheit[]>
  >(() => createInitialEinheitenState());
  const [katalogEditorId, setKatalogEditorId] = useState<string | null>(null);
  const [katalogBetrag, setKatalogBetrag] = useState("");
  const [katalogVerteilschluessel, setKatalogVerteilschluessel] =
    useState<Verteilschluessel>("Direkt");
  const [katalogDirekteEinheitId, setKatalogDirekteEinheitId] = useState("");
  const [bearbeiteteSonderpositionId, setBearbeiteteSonderpositionId] = useState<
    string | null
  >(null);
  const [sonderpositionForm, setSonderpositionForm] = useState<SonderpositionForm>(
    createEmptySonderpositionForm(),
  );
  const [openSections, setOpenSections] = useState<Record<DetailSectionKey, boolean>>(
    defaultOpenSections,
  );

  const objektOptionen = useMemo(() => {
    return beispielObjekte.map((item) => `${item.displayId} | ${item.name}`);
  }, []);

  const gefilterteAbrechnungen = useMemo(() => {
    return abrechnungen.filter((item) => {
      const matchSuchtext =
        suchtext.trim() === "" ||
        item.objektName.toLowerCase().includes(suchtext.toLowerCase()) ||
        item.objektDisplayId.toLowerCase().includes(suchtext.toLowerCase()) ||
        item.id.toLowerCase().includes(suchtext.toLowerCase());

      const matchObjekt =
        objektFilter === "ALLE" ||
        `${item.objektDisplayId} | ${item.objektName}` === objektFilter;

      const matchStatus =
        statusFilter === "ALLE"
          ? true
          : statusFilter === "AKTIV"
            ? item.status === "In Arbeit"
            : item.status === statusFilter;

      return matchSuchtext && matchObjekt && matchStatus;
    });
  }, [abrechnungen, objektFilter, statusFilter, suchtext]);

  useEffect(() => {
    if (!selectedAbrechnungId) return;

    const existsInFilteredList = gefilterteAbrechnungen.some(
      (item) => item.id === selectedAbrechnungId,
    );

    if (!existsInFilteredList) {
      setSelectedAbrechnungId(null);
    }
  }, [gefilterteAbrechnungen, selectedAbrechnungId]);

  useEffect(() => {
    setKatalogEditorId(null);
    setKatalogBetrag("");
    setKatalogVerteilschluessel("Direkt");
    setKatalogDirekteEinheitId("");
    setBearbeiteteSonderpositionId(null);
    setSonderpositionForm(createEmptySonderpositionForm());
    setOpenSections(defaultOpenSections);
  }, [selectedAbrechnungId]);

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

  const optionalePositionen = useMemo(() => {
    return selectedPositionen.filter((item) => item.art === "optional");
  }, [selectedPositionen]);

  const sonderpositionen = useMemo(() => {
    return selectedPositionen.filter((item) => item.art === "sonder");
  }, [selectedPositionen]);

  const standardAktivCount = useMemo(() => {
    return standardPositionen.filter((item) => isPositionAktiv(item)).length;
  }, [standardPositionen]);

  const optionaleAktivCount = useMemo(() => {
    return optionalePositionen.filter((item) => isPositionAktiv(item)).length;
  }, [optionalePositionen]);

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

  const aktivePositionen = useMemo(() => {
    return selectedPositionen.filter((item) => isPositionAktiv(item));
  }, [selectedPositionen]);

  const verteilungAktiverPositionen = useMemo(() => {
    return createVerteilungAktiverPositionen(selectedPositionen, selectedEinheiten);
  }, [selectedEinheiten, selectedPositionen]);

  const abschlusspruefung = useMemo(() => {
    return createAbschlusspruefung(selectedPositionen, selectedEinheiten);
  }, [selectedEinheiten, selectedPositionen]);

  const abrechnungsergebnisJeEinheit = useMemo(() => {
    return selectedEinheiten.map((einheit) => {
      const umlagefaehigAnteil = verteilungAktiverPositionen.reduce((sum, row) => {
        const anteil =
          row.verteilungJeEinheit.find((entry) => entry.id === einheit.id)?.anteil ?? 0;
        return row.position.umlagefaehig ? sum + anteil : sum;
      }, 0);

      const nichtUmlagefaehigAnteil = verteilungAktiverPositionen.reduce(
        (sum, row) => {
          const anteil =
            row.verteilungJeEinheit.find((entry) => entry.id === einheit.id)?.anteil ?? 0;
          return row.position.umlagefaehig ? sum : sum + anteil;
        },
        0,
      );

      const gesamtAnteil = umlagefaehigAnteil + nichtUmlagefaehigAnteil;
      const mieterSaldo = umlagefaehigAnteil - einheit.vorauszahlung;
      const mieterStatus =
        Math.abs(mieterSaldo) < 0.01
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
  }, [selectedEinheiten, verteilungAktiverPositionen]);

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

  const istArchiviert = selectedAbrechnung?.status === "Archiviert";

  function resetFilters() {
    setSuchtext("");
    setObjektFilter("ALLE");
    setStatusFilter("AKTIV");
  }

  function resetKatalogEditor() {
    setKatalogEditorId(null);
    setKatalogBetrag("");
    setKatalogVerteilschluessel("Direkt");
    setKatalogDirekteEinheitId("");
  }

  function resetSonderpositionForm() {
    setBearbeiteteSonderpositionId(null);
    setSonderpositionForm(createEmptySonderpositionForm());
  }

  function toggleSection(sectionKey: DetailSectionKey) {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
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

    setAbrechnungen((prev) => [neueAbrechnung, ...prev]);
    setPositionsByAbrechnungId((prev) => ({
      ...prev,
      [nextId]: createInitialPositionenForAbrechnung(nextId),
    }));
    setEinheitenByAbrechnungId((prev) => ({
      ...prev,
      [nextId]: createInitialEinheitenForAbrechnung(nextId),
    }));
    setSuchtext("");
    setObjektFilter("ALLE");
    setStatusFilter("AKTIV");
    setSelectedAbrechnungId(nextId);
    setDialogOpen(false);
  }

  function handleAction(item: NebenkostenAbrechnung, action: AbrechnungAktion) {
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

    const pruefung = createAbschlusspruefung(
      positionsByAbrechnungId[item.id] ?? [],
      einheitenByAbrechnungId[item.id] ?? [],
    );

    if (!pruefung.istVollstaendig) {
      setSelectedAbrechnungId(item.id);
      resetKatalogEditor();
      resetSonderpositionForm();
      return;
    }

    const heute = currentDateForDisplay();

    setAbrechnungen((prev) =>
      prev.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              status: "Archiviert",
              positivGeprueftAm: heute,
              geaendertAm: heute,
            }
          : entry,
      ),
    );
    setSelectedAbrechnungId(item.id);
    resetKatalogEditor();
    resetSonderpositionForm();
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

  return (
    <div className="space-y-6">
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

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_280px_220px]">
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
                <option key={option} value={option}>
                  {option}
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

      <AbrechnungDetailPanel item={selectedAbrechnung} />

      {selectedAbrechnung ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Positionen
              </p>
              <h4 className="mt-2 text-xl font-semibold text-zinc-900">
                Jahresabrechnung – Positionen
              </h4>
              <p className="mt-2 text-sm text-zinc-600">
                Standard und optional sind vorgeblendet. Eine Bezeichnung wird nur für Sonderpositionen erfasst.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill tone="teal">{selectedAbrechnung.id}</StatusPill>
              <StatusPill>{selectedPositionen.length} Positionen</StatusPill>
              {selectedKatalogPosition ? <StatusPill>Kostenart aktiv</StatusPill> : null}
              {bearbeiteteSonderposition ? <StatusPill>Sonderposition aktiv</StatusPill> : null}
              {istArchiviert ? <StatusPill>Nur lesbar</StatusPill> : null}
            </div>
          </div>

          <DetailAccordionSection
            sectionKey="abschlusspruefung"
            isOpen={openSections.abschlusspruefung}
            onToggle={toggleSection}
            eyebrow="Abschlussprüfung"
            title="Fachliche Vollständigkeit vor Archivierung"
            description="„Positiv geprüft“ bleibt gesperrt, bis alle fachlichen Pflichtpunkte erfüllt sind."
            badges={
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={abschlusspruefung.istVollstaendig ? "dark" : "amber"}>
                  {abschlusspruefung.istVollstaendig ? "fachlich vollständig" : "Prüfung offen"}
                </StatusPill>
                <StatusPill>{aktivePositionen.length} aktive Positionen</StatusPill>
                <StatusPill>{selectedEinheiten.length} Abrechnungseinheiten</StatusPill>
              </div>
            }
            sectionClassName="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
          >
            <>
              {abschlusspruefung.istVollstaendig ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-900">
                    Fachliche Abschlussprüfung erfüllt. „Positiv geprüft“ ist freigegeben.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900">
                    „Positiv geprüft“ ist noch gesperrt. Es fehlen noch diese Punkte:
                  </p>
                  <div className="mt-3 space-y-2">
                    {abschlusspruefung.fehlendeAngaben.map((item) => (
                      <p key={item} className="text-sm text-amber-900">
                        • {item}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          </DetailAccordionSection>

          <DetailAccordionSection
            sectionKey="standardkostenarten"
            isOpen={openSections.standardkostenarten}
            onToggle={toggleSection}
            eyebrow="Standardkostenarten"
            title="Immer vorhanden"
            description="Aktiv in dieser Abrechnung nur mit Betrag größer 0."
            badges={
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="dark">{standardPositionen.length} Standardpositionen</StatusPill>
                <StatusPill>{standardAktivCount} aktiv in dieser Abrechnung</StatusPill>
              </div>
            }
            sectionClassName="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
          >
            <>
              <div className="space-y-3">
                {standardPositionen.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill>{item.kostenart}</StatusPill>
                          <StatusPill tone={item.umlagefaehig ? "dark" : "neutral"}>
                            {item.umlagefaehig ? "Umlagefähig" : "Nicht umlagefähig"}
                          </StatusPill>
                          <StatusPill tone="blue">{item.verteilschluessel}</StatusPill>
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                              getErfassungsStatusClassName(item),
                            ].join(" ")}
                          >
                            {getErfassungsStatus(item)}
                          </span>
                        </div>
                        <h6 className="mt-3 text-base font-semibold text-zinc-900">
                          {item.kostenart}
                        </h6>
                        <p className="mt-1 text-sm text-zinc-600">
                          Betrag aktuell: {formatCurrency(item.betrag)}
                        </p>
                      </div>

                      {!istArchiviert ? (
                        <button
                          type="button"
                          onClick={() => handleStartKatalogBearbeiten(item)}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800"
                        >
                          {item.betrag > 0 ? "Betrag ändern" : "Betrag ergänzen"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          </DetailAccordionSection>

          <DetailAccordionSection
            sectionKey="optionaleKostenarten"
            isOpen={openSections.optionaleKostenarten}
            onToggle={toggleSection}
            eyebrow="Optionale Kostenarten"
            title="Vorgeblendet, bei Bedarf ergänzen"
            description="Aktiv in dieser Abrechnung nur mit Betrag größer 0."
            badges={
              <div className="flex flex-wrap gap-2">
                <StatusPill>{optionalePositionen.length} optionale Kostenarten</StatusPill>
                <StatusPill>{optionaleAktivCount} aktiv in dieser Abrechnung</StatusPill>
              </div>
            }
            sectionClassName="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
          >
            <>
              <div className="space-y-3">
                {optionalePositionen.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill>{item.kostenart}</StatusPill>
                          <StatusPill tone={item.umlagefaehig ? "dark" : "neutral"}>
                            {item.umlagefaehig ? "Umlagefähig" : "Nicht umlagefähig"}
                          </StatusPill>
                          <StatusPill tone="blue">{item.verteilschluessel}</StatusPill>
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                              getErfassungsStatusClassName(item),
                            ].join(" ")}
                          >
                            {getErfassungsStatus(item)}
                          </span>
                        </div>
                        <h6 className="mt-3 text-base font-semibold text-zinc-900">
                          {item.kostenart}
                        </h6>
                        <p className="mt-1 text-sm text-zinc-600">
                          Betrag aktuell: {formatCurrency(item.betrag)}
                        </p>
                      </div>

                      {!istArchiviert ? (
                        <button
                          type="button"
                          onClick={() => handleStartKatalogBearbeiten(item)}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800"
                        >
                          {item.betrag > 0 ? "Betrag ändern" : "Betrag ergänzen"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          </DetailAccordionSection>

          {selectedKatalogPosition ? (
            <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Kostenart bearbeiten
                </p>
                <h5 className="mt-2 text-lg font-semibold text-zinc-900">
                  Nur Betrag ergänzen
                </h5>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Kostenart
                  </span>
                  <input
                    value={selectedKatalogPosition.kostenart}
                    disabled
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-4 text-sm text-zinc-900 outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Betrag
                  </span>
                  <input
                    value={katalogBetrag}
                    onChange={(event) => setKatalogBetrag(event.target.value)}
                    disabled={istArchiviert}
                    placeholder="0,00"
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition disabled:bg-zinc-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Verteilschlüssel
                  </span>
                  <select
                    value={katalogVerteilschluessel}
                    onChange={(event) =>
                      setKatalogVerteilschluessel(
                        event.target.value as Verteilschluessel,
                      )
                    }
                    disabled={istArchiviert}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition disabled:bg-zinc-100"
                  >
                    {verteilschluesselOptionen.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {katalogVerteilschluessel === "Direkt" ? (
                <div className="mt-4">
                  <label className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Direkte Einheit
                    </span>
                    <select
                      value={katalogDirekteEinheitId}
                      onChange={(event) => setKatalogDirekteEinheitId(event.target.value)}
                      disabled={istArchiviert}
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition disabled:bg-zinc-100"
                    >
                      <option value="">Bitte Einheit wählen</option>
                      {selectedEinheiten.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.einheit} | {item.einheitId} | {item.reportLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetKatalogEditor}
                  disabled={istArchiviert}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSaveKatalogBetrag}
                  disabled={istArchiviert}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  Betrag speichern
                </button>
              </div>
            </section>
          ) : null}

          <DetailAccordionSection
            sectionKey="sonderpositionen"
            isOpen={openSections.sonderpositionen}
            onToggle={toggleSection}
            eyebrow="Sonderpositionen"
            title="Eigene Bezeichnung nur hier"
            badges={<StatusPill>{sonderpositionen.length} Sonderpositionen</StatusPill>}
            sectionClassName="mt-6 rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <>
              <div className="grid gap-4 xl:grid-cols-4">
                <label className="space-y-2 xl:col-span-2">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Bezeichnung
                  </span>
                  <input
                    value={sonderpositionForm.bezeichnung}
                    onChange={(event) =>
                      setSonderpositionForm((prev) => ({
                        ...prev,
                        bezeichnung: event.target.value,
                      }))
                    }
                    disabled={istArchiviert}
                    placeholder="z. B. Reparatur Abwasserleitung"
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition disabled:bg-zinc-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Betrag
                  </span>
                  <input
                    value={sonderpositionForm.betrag}
                    onChange={(event) =>
                      setSonderpositionForm((prev) => ({
                        ...prev,
                        betrag: event.target.value,
                      }))
                    }
                    disabled={istArchiviert}
                    placeholder="0,00"
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition disabled:bg-zinc-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Verteilschlüssel
                  </span>
                  <select
                    value={sonderpositionForm.verteilschluessel}
                    onChange={(event) =>
                      setSonderpositionForm((prev) => ({
                        ...prev,
                        verteilschluessel: event.target.value as Verteilschluessel,
                      }))
                    }
                    disabled={istArchiviert}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition disabled:bg-zinc-100"
                  >
                    {verteilschluesselOptionen.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {sonderpositionForm.verteilschluessel === "Direkt" ? (
                <div className="mt-4">
                  <label className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Direkte Einheit
                    </span>
                    <select
                      value={sonderpositionForm.direkteEinheitId}
                      onChange={(event) =>
                        setSonderpositionForm((prev) => ({
                          ...prev,
                          direkteEinheitId: event.target.value,
                        }))
                      }
                      disabled={istArchiviert}
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition disabled:bg-zinc-100"
                    >
                      <option value="">Bitte Einheit wählen</option>
                      {selectedEinheiten.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.einheit} | {item.einheitId} | {item.reportLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={sonderpositionForm.umlagefaehig}
                    onChange={(event) =>
                      setSonderpositionForm((prev) => ({
                        ...prev,
                        umlagefaehig: event.target.checked,
                      }))
                    }
                    disabled={istArchiviert}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  <span className="text-sm text-zinc-700">Umlagefähig</span>
                </label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {bearbeiteteSonderposition ? (
                    <button
                      type="button"
                      onClick={resetSonderpositionForm}
                      disabled={istArchiviert}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                    >
                      Bearbeitung abbrechen
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSaveSonderposition}
                    disabled={istArchiviert}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                  >
                    {bearbeiteteSonderposition
                      ? "Sonderposition speichern"
                      : "Sonderposition hinzufügen"}
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {sonderpositionen.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-medium text-zinc-900">
                      Noch keine Sonderpositionen
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Eigene Bezeichnungen werden nur hier erfasst.
                    </p>
                  </div>
                ) : (
                  sonderpositionen.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill>Sonderposition</StatusPill>
                            <StatusPill tone={item.umlagefaehig ? "dark" : "neutral"}>
                              {item.umlagefaehig ? "Umlagefähig" : "Nicht umlagefähig"}
                            </StatusPill>
                            <StatusPill tone="blue">{item.verteilschluessel}</StatusPill>
                          </div>
                          <h6 className="mt-3 text-base font-semibold text-zinc-900">
                            {item.bezeichnung}
                          </h6>
                          <p className="mt-1 text-sm text-zinc-600">
                            Erfasst am {item.erfasstAm}
                          </p>
                        </div>

                        <div className="flex flex-col gap-3 xl:items-end">
                          <div className="text-left xl:text-right">
                            <p className="text-sm text-zinc-500">Betrag</p>
                            <p className="mt-1 text-lg font-semibold text-zinc-900">
                              {formatCurrency(item.betrag)}
                            </p>
                          </div>

                          {!istArchiviert ? (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                onClick={() => handleStartSonderpositionBearbeiten(item)}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800"
                              >
                                Sonderposition bearbeiten
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSonderposition(item.id)}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800"
                              >
                                Sonderposition löschen
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          </DetailAccordionSection>

          <DetailAccordionSection
            sectionKey="abrechnungseinheiten"
            isOpen={openSections.abrechnungseinheiten}
            onToggle={toggleSection}
            eyebrow="Abrechnungseinheiten"
            title="Basis für die spätere Verteilung"
            description="Einheit, stabile Einheit-ID, Report-Klartext, Eigentümer, Mieter, Fläche, MEA und Vorauszahlung sind je Abrechnung vorbereitet."
            badges={
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="dark">{selectedEinheiten.length} Einheiten</StatusPill>
                <StatusPill>{einheitenSummen.summeFlaeche.toFixed(2)} m²</StatusPill>
                <StatusPill>{einheitenSummen.summeMea} MEA</StatusPill>
                <StatusPill>{formatCurrency(einheitenSummen.summeVorauszahlung)} Vorauszahlung</StatusPill>
              </div>
            }
            sectionClassName="mt-6 rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                {selectedEinheiten.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone="teal">{item.einheit}</StatusPill>
                      <StatusPill>{item.mea} MEA</StatusPill>
                    </div>
                    <h6 className="mt-3 text-base font-semibold text-zinc-900">
                      {item.eigentuemer}
                    </h6>
                    <p className="mt-1 text-sm text-zinc-600">Mieter: {item.mieter}</p>
                    <p className="mt-1 text-sm text-zinc-600">WEG-ID: {item.wegId}</p>
                    <p className="mt-1 text-sm text-zinc-600">Einheit-ID: {item.einheitId}</p>
                    <p className="mt-1 text-sm text-zinc-600">Report: {item.reportLabel}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Fläche
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-900">
                          {item.flaeche.toFixed(2)} m²
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          MEA
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-900">
                          {item.mea}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Vorauszahlung
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-900">
                          {formatCurrency(item.vorauszahlung)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          </DetailAccordionSection>

          <DetailAccordionSection
            sectionKey="verteilung"
            isOpen={openSections.verteilung}
            onToggle={toggleSection}
            eyebrow="Verteilung aktiver Kostenarten"
            title="Nur Positionen mit Betrag größer 0"
            description="Verteilung nach MEA, Fläche oder Einheit. Direkt wird einer konkreten Einheit zugeordnet."
            badges={
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="dark">{aktivePositionen.length} aktive Positionen</StatusPill>
              </div>
            }
            sectionClassName="mt-6 rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <>
              <div className="space-y-4">
                {verteilungAktiverPositionen.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-medium text-zinc-900">
                      Noch keine aktiven Kostenarten
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Erst Positionen mit Betrag größer 0 werden hier verteilt.
                    </p>
                  </div>
                ) : (
                  verteilungAktiverPositionen.map((row) => (
                    <div
                      key={row.position.id}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill>{row.position.kostenart}</StatusPill>
                            <StatusPill>{row.position.verteilschluessel}</StatusPill>
                            <StatusPill tone={row.offenerBetrag === 0 ? "dark" : "amber"}>
                              {row.offenerBetrag === 0 ? "voll verteilt" : "noch offen"}
                            </StatusPill>
                          </div>
                          <p className="mt-3 text-sm text-zinc-600">
                            Gesamtbetrag: {formatCurrency(row.position.betrag)}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-zinc-200 bg-white p-3">
                            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                              Verteilt
                            </p>
                            <p className="mt-1 text-sm font-medium text-zinc-900">
                              {formatCurrency(row.verteilteSumme)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-zinc-200 bg-white p-3">
                            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                              Offen
                            </p>
                            <p className="mt-1 text-sm font-medium text-zinc-900">
                              {formatCurrency(row.offenerBetrag)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        {row.verteilungJeEinheit.map((einheit) => (
                          <div
                            key={`${row.position.id}__${einheit.id}`}
                            className="rounded-xl border border-zinc-200 bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-zinc-900">
                                  {einheit.einheit}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {einheit.eigentuemer}
                                </p>
                              </div>
                              <p className="text-sm font-medium text-zinc-900">
                                {formatCurrency(einheit.anteil)}
                              </p>
                            </div>
                            <p className="mt-3 text-xs text-zinc-500">{einheit.basis}</p>
                          </div>
                        ))}
                      </div>

                      {row.position.verteilschluessel === "Direkt" ? (
                        row.position.direkteEinheitId ? (
                          <p className="mt-4 text-sm text-green-700">
                            Direkt zugeordnet an{" "}
                            {row.verteilungJeEinheit.find((einheit) => einheit.anteil > 0)?.einheit}
                          </p>
                        ) : (
                          <p className="mt-4 text-sm text-amber-700">
                            Direkte Zuordnung fehlt noch.
                          </p>
                        )
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </>
          </DetailAccordionSection>

          <DetailAccordionSection
            sectionKey="ergebnis"
            isOpen={openSections.ergebnis}
            onToggle={toggleSection}
            eyebrow="Ergebnis je Wohnung"
            title="Mieter / Vermieter getrennt"
            description="Umlagefähig läuft auf den Mieter. Nicht umlagefähig bleibt beim Vermieter."
            badges={
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="dark">{abrechnungsergebnisJeEinheit.length} Wohnungen</StatusPill>
              </div>
            }
            sectionClassName="mt-6 rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                {abrechnungsergebnisJeEinheit.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone="teal">{item.einheit}</StatusPill>
                      <StatusPill>{item.einheitId}</StatusPill>
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                          item.mieterStatus === "Nachzahlung"
                            ? "bg-red-50 text-red-700"
                            : item.mieterStatus === "Guthaben"
                              ? "bg-green-50 text-green-700"
                              : "bg-zinc-100 text-zinc-700",
                        ].join(" ")}
                      >
                        {item.mieterStatus}
                      </span>
                    </div>

                    <h6 className="mt-3 text-base font-semibold text-zinc-900">
                      {item.eigentuemer}
                    </h6>
                    <p className="mt-1 text-sm text-zinc-600">Mieter: {item.mieter}</p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Umlagefähig
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-900">
                          {formatCurrency(item.umlagefaehigAnteil)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Nicht umlagefähig
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-900">
                          {formatCurrency(item.nichtUmlagefaehigAnteil)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Vorauszahlung
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-900">
                          {formatCurrency(item.vorauszahlung)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Mieter-Saldo
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-900">
                          {formatCurrency(Math.abs(item.mieterSaldo))}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Gesamtanteil Wohnung
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-900">
                          {formatCurrency(item.gesamtAnteil)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-500">Summe gesamt</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-900">
                    {formatCurrency(summen.summeGesamt)}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-500">Summe umlagefähig</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-900">
                    {formatCurrency(summen.summeUmlagefaehig)}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-500">Summe nicht umlagefähig</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-900">
                    {formatCurrency(summen.summeNichtUmlagefaehig)}
                  </p>
                </div>
              </div>
            </>
          </DetailAccordionSection>
        </section>
      ) : null}

      <div className="space-y-4">
        {gefilterteAbrechnungen.length === 0 ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-900">Keine Abrechnungen gefunden</p>
            <p className="mt-2 text-sm text-zinc-600">
              Passe Suche oder Filter an, um wieder Einträge zu sehen.
            </p>
          </section>
        ) : (
          gefilterteAbrechnungen.map((item) => (
            <AbrechnungRow key={item.id} item={item} onAction={handleAction} />
          ))
        )}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          Nächster Ausbau
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3">
            <p className="text-sm text-zinc-500">Standardkostenarten</p>
            <p className="text-sm font-medium text-zinc-900">Immer vorgeblendet</p>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3">
            <p className="text-sm text-zinc-500">Optionale Kostenarten</p>
            <p className="text-sm font-medium text-zinc-900">Immer vorgeblendet</p>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3">
            <p className="text-sm text-zinc-500">Bezeichnung</p>
            <p className="text-sm font-medium text-zinc-900">Nur bei Sonderposition</p>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0">
            <p className="text-sm text-zinc-500">Archiv</p>
            <p className="text-sm font-medium text-zinc-900">Weiter nur lesbar</p>
          </div>
        </div>
      </section>

      <NeueAbrechnungDialog
        open={dialogOpen}
        objekte={beispielObjekte}
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




















'@ | Set-Content -Path $path -Encoding UTF8
