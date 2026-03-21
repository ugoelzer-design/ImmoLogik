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
    verteilschluessel: "MEA" | "FlÃ¤che" | "Einheit" | "Direkt";
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatArea(value: number) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSaldo(value: number) {
  const betrag = Math.abs(value);

  if (betrag < 0.01) {
    return "Ausgeglichen";
  }

  return value > 0
    ? `Nachzahlung ${formatCurrency(betrag)}`
    : `Guthaben ${formatCurrency(betrag)}`;
}

function formatZeitraum(item: NebenkostenAbrechnung) {
  return `${item.zeitraumVon} bis ${item.zeitraumBis}`;
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
  const offenePruefpunkte = abschlusspruefung.pruefpunkte.filter(
    (entry) => !entry.istErfuellt,
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Jahresabrechnung â€“ Endansicht
          </p>
          <h4 className="mt-2 text-xl font-semibold text-zinc-900">{item.id}</h4>
          <p className="mt-2 text-sm text-zinc-600">
            {item.objektDisplayId} Â· {item.objektName} Â· {formatZeitraum(item)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusPill tone="teal">{item.objektDisplayId}</StatusPill>
          <StatusPill tone={abschlusspruefung.istVollstaendig ? "dark" : "amber"}>
            {abschlusspruefung.istVollstaendig ? "PrÃ¼fung erfÃ¼llt" : "PrÃ¼fung offen"}
          </StatusPill>
          <StatusPill>{item.status}</StatusPill>
          {item.positivGeprueftAm ? (
            <StatusPill>Positiv geprÃ¼ft am {item.positivGeprueftAm}</StatusPill>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Gesamtkosten</p>
          <p className="mt-2 text-lg font-semibold text-zinc-900">
            {formatCurrency(summen.summeGesamt)}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            UmlagefÃ¤hig {formatCurrency(summen.summeUmlagefaehig)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Nicht umlagefÃ¤hig
          </p>
          <p className="mt-2 text-lg font-semibold text-zinc-900">
            {formatCurrency(summen.summeNichtUmlagefaehig)}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {verteilungAktiverPositionen.length} aktive Positionen in Verteilung
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Abrechnungseinheiten
          </p>
          <p className="mt-2 text-lg font-semibold text-zinc-900">
            {abrechnungsergebnisJeEinheit.length} Einheiten
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            FlÃ¤che {formatArea(einheitenSummen.summeFlaeche)} mÂ² Â· MEA {einheitenSummen.summeMea}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Vorauszahlungen
          </p>
          <p className="mt-2 text-lg font-semibold text-zinc-900">
            {formatCurrency(einheitenSummen.summeVorauszahlung)}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Stand aus den aktuell vorbereiteten Abrechnungseinheiten
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              PrÃ¼f- und Archivstatus
            </p>
            <h5 className="mt-2 text-lg font-semibold text-zinc-900">
              Abschluss vor Freigabe und Archiv
            </h5>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={abschlusspruefung.istVollstaendig ? "dark" : "amber"}>
              {abschlusspruefung.istVollstaendig ? "vollstÃ¤ndig" : `${offenePruefpunkte.length} offen`}
            </StatusPill>
            <StatusPill>{item.status}</StatusPill>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {abschlusspruefung.pruefpunkte.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border p-4 ${
                entry.istErfuellt
                  ? "border-green-200 bg-green-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p
                    className={`text-sm font-medium ${
                      entry.istErfuellt ? "text-green-900" : "text-amber-900"
                    }`}
                  >
                    {entry.label}
                  </p>
                  {entry.hinweis ? (
                    <p
                      className={`mt-1 text-sm ${
                        entry.istErfuellt ? "text-green-800" : "text-amber-800"
                      }`}
                    >
                      {entry.hinweis}
                    </p>
                  ) : null}
                </div>
                <StatusPill tone={entry.istErfuellt ? "dark" : "amber"}>
                  {entry.istErfuellt ? "OK" : "Offen"}
                </StatusPill>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Kostenverteilung je Position
            </p>
            <h5 className="mt-2 text-lg font-semibold text-zinc-900">
              Verteilung und rechnerische VollstÃ¤ndigkeit
            </h5>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill>{verteilungAktiverPositionen.length} Positionen</StatusPill>
          </div>
        </div>

        {verteilungAktiverPositionen.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
            Noch keine aktive Position mit Betrag grÃ¶ÃŸer 0 vorhanden.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {verteilungAktiverPositionen.map((row) => (
              <div key={row.position.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{row.position.bezeichnung}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {row.position.kostenart} Â· {row.position.verteilschluessel} Â· {row.position.umlagefaehig ? "umlagefÃ¤hig" : "nicht umlagefÃ¤hig"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="teal">{formatCurrency(row.position.betrag)}</StatusPill>
                    <StatusPill tone={row.offenerBetrag === 0 ? "dark" : "amber"}>
                      {row.offenerBetrag === 0 ? "vollstÃ¤ndig verteilt" : `offen ${formatCurrency(row.offenerBetrag)}`}
                    </StatusPill>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {row.verteilungJeEinheit.map((entry) => (
                    <div
                      key={entry.id}
                      className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_140px] md:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{entry.einheit}</p>
                        <p className="mt-1 text-sm text-zinc-600">{entry.eigentuemer}</p>
                      </div>
                      <p className="text-sm text-zinc-600">{entry.basis || "Keine Basis hinterlegt"}</p>
                      <p className="text-sm font-medium text-zinc-900 md:text-right">
                        {formatCurrency(entry.anteil)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
                  <StatusPill>Verteilt {formatCurrency(row.verteilteSumme)}</StatusPill>
                  {row.offenerBetrag > 0 ? (
                    <StatusPill tone="amber">Rest {formatCurrency(row.offenerBetrag)}</StatusPill>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Ergebnis je Einheit
            </p>
            <h5 className="mt-2 text-lg font-semibold text-zinc-900">
              Mieterrelevantes Ergebnis und Saldo
            </h5>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill>{abrechnungsergebnisJeEinheit.length} Einheiten</StatusPill>
          </div>
        </div>

        {abrechnungsergebnisJeEinheit.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
            Noch keine Abrechnungseinheiten vorhanden.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {abrechnungsergebnisJeEinheit.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{entry.reportLabel}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {entry.eigentuemer} Â· {entry.mieter}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="teal">{entry.einheit}</StatusPill>
                    <StatusPill>{entry.mieterStatus}</StatusPill>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">FlÃ¤che</p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">
                      {formatArea(entry.flaeche)} mÂ²
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">MEA</p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">{entry.mea}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Vorauszahlung</p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">
                      {formatCurrency(entry.vorauszahlung)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Saldo Mieter</p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">{formatSaldo(entry.mieterSaldo)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">UmlagefÃ¤hig</p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">
                      {formatCurrency(entry.umlagefaehigAnteil)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Nicht umlagefÃ¤hig
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">
                      {formatCurrency(entry.nichtUmlagefaehigAnteil)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Gesamtanteil</p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">
                      {formatCurrency(entry.gesamtAnteil)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
