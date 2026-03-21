import React from "react";

export type ReportPositionVM = {
  kostenart: string;
  umlagefaehigLabel?: string;
  gesamtbetrag: string;
  verteilerschluessel: string;
  verteilung: string;
  anteil: string;
};

export type EinzelreportTemplateData = {
  objektName: string;
  einheitName: string; // e.g. "EG links"
  wohnungsbezeichnung?: string;
  empfaengerName: string;
  empfaengerAdresszeile1?: string;
  empfaengerAdresszeile2?: string;
  empfaengerAdresszeile3?: string;

  abrechnungszeitraumVon: string; // DD.MM.YYYY
  abrechnungszeitraumBis: string; // DD.MM.YYYY
  berichtsdatum?: string; // DD.MM.YYYY

  anrede: string;
  betreff?: string;

  vorauszahlungen: string;
  gesamtkostenanteil: string;
  ergebnisbetrag: string;
  ergebnisart: "Nachzahlung" | "Guthaben" | "Ausgeglichen";

  positionen: ReportPositionVM[];

  hinweistext?: string;
  grussformel?: string;
  absenderName?: string;
};

export const formatGermanDate = (value: string | Date) => {
  if (typeof value === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(value.trim())) {
    return value.trim();
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatEuro = (value: number) => {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const createEinheitTitel = (value: string) => {
  return value
    .replace(/^WE\s*\d+\s*[-–—:]?\s*/i, "")
    .replace(/^Einheit\s*/i, "")
    .trim();
};

const baseText = "#111827";
const mutedText = "#6b7280";
const lineColor = "#d1d5db";

const pageStyle: React.CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  margin: "0 auto 16mm",
  padding: "18mm",
  background: "#ffffff",
  color: baseText,
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "12pt",
  lineHeight: 1.45,
  boxSizing: "border-box",
  pageBreakAfter: "always",
};

const labelStyle: React.CSSProperties = {
  fontSize: "10pt",
  color: mutedText,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
};

const cardStyle: React.CSSProperties = {
  border: `1px solid ${lineColor}`,
  borderRadius: 8,
  padding: 14,
};

const tableCellStyle: React.CSSProperties = {
  borderBottom: `1px solid ${lineColor}`,
  padding: "10px 8px",
  textAlign: "left",
  verticalAlign: "top",
};


const normalizePersLabel = (value?: string) =>
  String(value ?? "").replace(/\bPersonen\b/g, "Pers.");

const createAdresszeilen = (data: EinzelreportTemplateData) => {
  const vorhandeneZeilen = [
    data.empfaengerAdresszeile1,
    data.empfaengerAdresszeile2,
    data.empfaengerAdresszeile3,
  ]
    .map((wert) => String(wert ?? "").trim())
    .filter(Boolean);

  if (vorhandeneZeilen.length > 0) {
    return vorhandeneZeilen;
  }

  return String(data.wohnungsbezeichnung ?? "")
    .split(",")
    .map((teil) => teil.trim())
    .filter(Boolean);
};


export function NebenkostenEinzelreportTemplate({
  data,
}: {
  data: EinzelreportTemplateData;
}) {
  const einheitTitel = createEinheitTitel(data.einheitName);
  const wohnungsbezeichnung =
    String(data.wohnungsbezeichnung ?? "").trim() || einheitTitel;
  const betreff =
    data.betreff ??
    `Nebenkostenabrechnung ${data.abrechnungszeitraumVon} bis ${data.abrechnungszeitraumBis}`;
  const versender = String(data.absenderName ?? data.objektName).trim();
  const adresszeilen = createAdresszeilen(data);
  const wegBezeichnung = String(data.objektName ?? "").trim();
  const wohneinheitBezeichnung = wohnungsbezeichnung;

  return (
    <section style={pageStyle}>
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 32,
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 260 }}>
          <div style={labelStyle}>Empfänger</div>
          <div>{data.empfaengerName}</div>
          {adresszeilen.map((zeile, index) => (
            <div key={`adresszeile-${index}`}>{zeile}</div>
          ))}
        </div>

        <div style={{ justifySelf: "end", textAlign: "right", minWidth: 260 }}>
          <div>{versender}</div>
          {data.berichtsdatum ? <div style={{ marginTop: 4 }}>{formatGermanDate(data.berichtsdatum)}</div> : null}
        </div>
      </header>

      <section style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: "18pt", margin: "0 0 10px" }}>
          Nebenkostenabrechnung
        </h1>

        <div style={{ marginBottom: 6, color: mutedText }}>
          WEG: {wegBezeichnung}
        </div>
        <div style={{ marginBottom: 12, color: mutedText }}>
          Wohneinheit: {wohneinheitBezeichnung}
        </div>
        <div style={{ marginBottom: 18, color: mutedText }}>
          Abrechnungszeitraum {formatGermanDate(data.abrechnungszeitraumVon)} bis {formatGermanDate(data.abrechnungszeitraumBis)}
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Betreff</div>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>{betreff}</div>
          <p style={{ margin: "0 0 10px" }}>{data.anrede}</p>
          <p style={{ margin: "0 0 10px" }}>
            Für Ihre Wohnung {wohnungsbezeichnung} erhalten Sie hier die Nebenkostenabrechnung für den Zeitraum {formatGermanDate(data.abrechnungszeitraumVon)} bis {formatGermanDate(data.abrechnungszeitraumBis)}.
          </p>
          <p style={{ margin: 0 }}>
            Die umlagefähigen Kosten wurden auf Grundlage der hinterlegten Verteilerschlüssel berechnet und mit den im Abrechnungszeitraum erfassten Vorauszahlungen verrechnet.
          </p>
        </div>
      </section>

      <section style={{ ...cardStyle, marginBottom: 24, padding: 0, overflow: "hidden" }}>
        {[
          ["Ihr Kostenanteil", data.gesamtkostenanteil],
          ["Ihre Vorauszahlungen", data.vorauszahlungen],
          ["Ergebnis", `${data.ergebnisbetrag} · ${data.ergebnisart}`],
        ].map(([label, value], index) => (
          <div
            key={label}
            style={{
              display: "grid",
              gridTemplateColumns: "240px 1fr",
              gap: 16,
              padding: "12px 14px",
              borderBottom: index < 2 ? `1px solid ${lineColor}` : "none",
              alignItems: "center",
            }}
          >
            <div style={{ ...labelStyle, marginBottom: 0 }}>{label}</div>
            <div style={{ fontSize: "15pt", fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: "14pt", margin: "0 0 12px" }}>Kostenaufstellung</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...tableCellStyle, color: mutedText, fontSize: "10pt" }}>Kostenart</th>
              <th style={{ ...tableCellStyle, color: mutedText, fontSize: "10pt" }}>Gesamt</th>
              <th style={{ ...tableCellStyle, color: mutedText, fontSize: "10pt" }}>Schlüssel</th>
              <th style={{ ...tableCellStyle, color: mutedText, fontSize: "10pt" }}>Verteilung</th>
              <th style={{ ...tableCellStyle, color: mutedText, fontSize: "10pt" }}>Ihr Anteil</th>
            </tr>
          </thead>
          <tbody>
            {data.positionen.map((position, index) => (
              <tr key={`${position.kostenart}-${index}`}>
                <td style={tableCellStyle}>
                  <div>{position.kostenart}</div>
                  {position.umlagefaehigLabel ? (
                    <div style={{ color: mutedText, fontSize: "10pt", marginTop: 2 }}>
                      {position.umlagefaehigLabel}
                    </div>
                  ) : null}
                </td>
                <td style={tableCellStyle}>{position.gesamtbetrag}</td>
                <td style={tableCellStyle}>{normalizePersLabel(position.verteilerschluessel)}</td>
                <td style={tableCellStyle}>{normalizePersLabel(position.verteilung)}</td>
                <td style={tableCellStyle}>{position.anteil}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {data.hinweistext ? (
        <section style={{ marginTop: 24 }}>
          <p style={{ margin: 0 }}>{data.hinweistext}</p>
        </section>
      ) : null}

      <footer style={{ marginTop: 32 }}>
        <p style={{ margin: "0 0 8px" }}>{data.grussformel ?? "Mit freundlichen Grüßen"}</p>
        <p style={{ margin: 0 }}>{versender}</p>
      </footer>
    </section>
  );
}

export function NebenkostenEinzelreportBatch({
  reports,
}: {
  reports: EinzelreportTemplateData[];
}) {
  return (
    <>
      {reports.map((report, index) => (
        <NebenkostenEinzelreportTemplate
          key={`${report.objektName}-${report.einheitName}-${index}`}
          data={report}
        />
      ))}
    </>
  );
}

export const exampleReportData: EinzelreportTemplateData = {
  objektName: "Musterobjekt",
  einheitName: "WE 01 - EG links",
  empfaengerName: "Max Mustermann",
  empfaengerAdresszeile1: "Musterstraße 1",
  empfaengerAdresszeile2: "12345 Musterstadt",
  abrechnungszeitraumVon: "01.01.2025",
  abrechnungszeitraumBis: "31.12.2025",
  berichtsdatum: "15.01.2026",
  anrede: "Sehr geehrter Herr Mustermann,",
  vorauszahlungen: "600,00 €",
  gesamtkostenanteil: "772,86 €",
  ergebnisbetrag: "172,86 €",
  ergebnisart: "Nachzahlung",
  positionen: [
    {
      kostenart: "Allgemeinstrom",
      umlagefaehigLabel: "umlagefähig",
      gesamtbetrag: "100,00 €",
      verteilerschluessel: "Pers.",
      verteilung: "3 / 5 Pers.",
      anteil: "60,00 €",
    },
    {
      kostenart: "Gebäudeversicherung",
      umlagefaehigLabel: "umlagefähig",
      gesamtbetrag: "100,00 €",
      verteilerschluessel: "MEA",
      verteilung: "467 / 1000 MEA",
      anteil: "46,70 €",
    },
  ],
  hinweistext: "Bitte gleichen Sie eine etwaige Nachzahlung innerhalb der angegebenen Frist aus.",
  grussformel: "Mit freundlichen Grüßen",
  absenderName: "Hausverwaltung Muster GmbH",
};
