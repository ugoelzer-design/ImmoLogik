"use client";

import { StatusPill } from "../shared/StatusPill";
import type { NebenkostenAbrechnung } from "../../types/nebenkosten";

type ReportPruefpunkt = {
  id: string;
  label: string;
  istErfuellt: boolean;
  hinweis: string;
};

type ReportAbschlusspruefung = {
  istVollstaendig: boolean;
  pruefpunkte: ReportPruefpunkt[];
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

type ReportVerteilungsEintrag = {
  id: string;
  einheit: string;
  eigentuemer: string;
  basis: string;
  anteil: number;
};

type ReportVerteilungsZeile = {
  position: {
    id: string;
    bezeichnung: string;
    kostenart: string;
    betrag: number;
    umlagefaehig: boolean;
    verteilschluessel: "MEA" | "Fläche" | "Einheit" | "Direkt" | "Personen";
  };
  verteilungJeEinheit: ReportVerteilungsEintrag[];
  verteilteSumme: number;
  offenerBetrag: number;
};

type ReportEinheitsergebnis = {
  id: string;
  reportLabel: string;
  einheit: string;
  eigentuemer: string;
  mieter: string;
  flaeche: number;
  mea: number;
  vorauszahlung: number;
  umlagefaehigAnteil: number;
  nichtUmlagefaehigAnteil: number;
  gesamtAnteil: number;
  mieterSaldo: number;
  mieterStatus: string;
};

type EinheitKostenzeile = {
  id: string;
  bezeichnung: string;
  gesamtkosten: number;
  verteilschluessel: string;
  verteilung: string;
  ihrAnteil: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatArea(value: number) {
  return `${formatNumber(value)} m²`;
}

function formatZeitraum(item: NebenkostenAbrechnung) {
  return `${item.zeitraumVon} bis ${item.zeitraumBis}`;
}

function getSaldoTone(value: number) {
  if (Math.abs(value) < 0.01) return "dark" as const;
  return value > 0 ? ("amber" as const) : ("green" as const);
}

function getSaldoLabel(value: number) {
  if (Math.abs(value) < 0.01) return "Ausgeglichen";
  return value > 0 ? "Nachzahlung" : "Guthaben";
}

function getMieterAnrede(mieter: string) {
  if (!mieter || mieter.toLowerCase().includes("leerstand")) {
    return "Sehr geehrte Damen und Herren,";
  }

  return `Sehr geehrte/r ${mieter},`;
}

function buildEinheitKostenzeilen(
  einheitId: string,
  verteilungAktiverPositionen: ReportVerteilungsZeile[],
): EinheitKostenzeile[] {
  return verteilungAktiverPositionen
    .filter((row) => row.position.umlagefaehig && row.position.betrag > 0)
    .map((row) => {
      const verteilung = row.verteilungJeEinheit.find((entry) => entry.id === einheitId);

      return {
        id: `${row.position.id}__${einheitId}`,
        bezeichnung: row.position.bezeichnung,
        gesamtkosten: row.position.betrag,
        verteilschluessel: row.position.verteilschluessel,
        verteilung: verteilung?.basis || "Keine Verteilung hinterlegt",
        ihrAnteil: verteilung?.anteil ?? 0,
      };
    })
    .filter((row) => row.ihrAnteil > 0)
    .sort((left, right) => right.ihrAnteil - left.ihrAnteil);
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-zinc-900">{value}</p>
      {detail ? <p className="mt-1 text-sm text-zinc-600">{detail}</p> : null}
    </div>
  );
}

function MieterReportCard({
  item,
  einheit,
  kostenzeilen,
}: {
  item: NebenkostenAbrechnung;
  einheit: ReportEinheitsergebnis;
  kostenzeilen: EinheitKostenzeile[];
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Betriebskostenabrechnung
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-zinc-900">
            {item.objektName}
          </h3>
          <p className="mt-2 text-base font-medium text-zinc-900">
            {einheit.reportLabel}
          </p>
          <p className="mt-1 text-sm text-zinc-600">{formatZeitraum(item)}</p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <StatusPill tone={getSaldoTone(einheit.mieterSaldo)}>
            {getSaldoLabel(einheit.mieterSaldo)}
          </StatusPill>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="text-sm leading-7 text-zinc-800">{getMieterAnrede(einheit.mieter)}</p>
        <p className="mt-3 text-sm leading-7 text-zinc-700">
          für die Einheit <span className="font-medium text-zinc-900">{einheit.reportLabel}</span>{" "}
          erhalten Sie hier die Betriebskostenabrechnung für den Zeitraum{" "}
          <span className="font-medium text-zinc-900">{formatZeitraum(item)}</span>.
        </p>
        <p className="mt-3 text-sm leading-7 text-zinc-700">
          Ihre umlagefähigen Kosten wurden auf Grundlage der hinterlegten Verteilerschlüssel
          berechnet und mit Ihren geleisteten Vorauszahlungen verrechnet.
        </p>
      </section>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="Ihre Gesamtkosten"
          value={formatCurrency(einheit.umlagefaehigAnteil)}
          detail="Umlagefähiger Kostenanteil"
        />
        <SummaryCard
          label="Ihre Vorauszahlungen"
          value={formatCurrency(einheit.vorauszahlung)}
          detail="Im Abrechnungszeitraum berücksichtigt"
        />
        <SummaryCard
          label="Ihr Ergebnis"
          value={formatCurrency(Math.abs(einheit.mieterSaldo))}
          detail={getSaldoLabel(einheit.mieterSaldo)}
        />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="Wohnfläche"
          value={formatArea(einheit.flaeche)}
        />
        <SummaryCard
          label="MEA"
          value={formatNumber(einheit.mea)}
        />
        <SummaryCard
          label="Mieter"
          value={einheit.mieter}
          detail={einheit.eigentuemer}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Kostenaufstellung
          </p>
          <h4 className="mt-2 text-xl font-semibold text-zinc-900">
            Ihr umlagefähiger Anteil
          </h4>
        </div>

        {kostenzeilen.length === 0 ? (
          <div className="p-5 text-sm text-zinc-600">
            Für diese Einheit sind aktuell keine umlagefähigen Positionen mit Anteil vorhanden.
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1.6fr)_120px_120px_minmax(0,1.2fr)_130px] gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <div>Kostenart</div>
              <div>Gesamt</div>
              <div>Schlüssel</div>
              <div>Verteilung</div>
              <div>Ihr Anteil</div>
            </div>

            <div className="divide-y divide-zinc-200">
              {kostenzeilen.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[minmax(0,1.6fr)_120px_120px_minmax(0,1.2fr)_130px] gap-3 px-5 py-4 text-sm text-zinc-700"
                >
                  <div className="font-medium text-zinc-900">{row.bezeichnung}</div>
                  <div>{formatCurrency(row.gesamtkosten)}</div>
                  <div>{row.verteilschluessel}</div>
                  <div>{row.verteilung}</div>
                  <div className="font-medium text-zinc-900">{formatCurrency(row.ihrAnteil)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          Ergebnis
        </p>
        <h4 className="mt-2 text-xl font-semibold text-zinc-900">
          Zusammenfassung Ihrer Abrechnung
        </h4>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-zinc-600">Umlagefähige Kosten</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">
                {formatCurrency(einheit.umlagefaehigAnteil)}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-600">Vorauszahlungen</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">
                {formatCurrency(einheit.vorauszahlung)}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-600">Ergebnis</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">
                {getSaldoLabel(einheit.mieterSaldo)} {formatCurrency(Math.abs(einheit.mieterSaldo))}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-zinc-700">
          Nicht umlagefähige Positionen werden in der Gesamtabrechnung der WEG berücksichtigt,
          sind jedoch nicht Bestandteil Ihres mieterseitigen Ergebnisses.
        </p>
      </section>
    </section>
  );
}

export function AbrechnungReportPanel({
  item,
  abschlusspruefung,
  summen,
  einheitenSummen,
  verteilungAktiverPositionen,
  abrechnungsergebnisJeEinheit,
}: {
  item: NebenkostenAbrechnung;
  abschlusspruefung: ReportAbschlusspruefung;
  summen: ReportSummen;
  einheitenSummen: ReportEinheitenSummen;
  verteilungAktiverPositionen: ReportVerteilungsZeile[];
  abrechnungsergebnisJeEinheit: ReportEinheitsergebnis[];
}) {
  const einheitenSortiert = [...abrechnungsergebnisJeEinheit].sort((left, right) =>
    left.reportLabel.localeCompare(right.reportLabel, "de"),
  );

  return (
    <section className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Reportpaket
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-zinc-900">
              Mieter-Reports je Einheit
            </h3>
            <p className="mt-2 text-sm text-zinc-600">{item.objektName}</p>
            <p className="mt-1 text-sm text-zinc-600">{formatZeitraum(item)}</p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <StatusPill tone={abschlusspruefung.istVollstaendig ? "dark" : "amber"}>
              {abschlusspruefung.istVollstaendig ? "Report freigegeben" : "Report gesperrt"}
            </StatusPill>
            <StatusPill>{einheitenSortiert.length} Einheiten</StatusPill>
            <StatusPill>{formatCurrency(summen.summeGesamt)} Gesamtkosten</StatusPill>
            <StatusPill>{formatCurrency(einheitenSummen.summeVorauszahlung)} Vorauszahlungen</StatusPill>
          </div>
        </div>
      </section>

      {einheitenSortiert.map((einheit) => (
        <MieterReportCard
          key={einheit.id}
          item={item}
          einheit={einheit}
          kostenzeilen={buildEinheitKostenzeilen(
            einheit.id,
            verteilungAktiverPositionen,
          )}
        />
      ))}
    </section>
  );
}
