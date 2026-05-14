import { describe, expect, it } from "vitest";
import {
  buildRecentActivities,
  countExpiringContracts,
  countOpenDocumentCases,
  countOpenReadingCampaigns,
  countRecentDocuments,
} from "./dashboard-metrics";

describe("dashboard-metrics", () => {
  it("sorts recent activities by date and limits the result", () => {
    const result = buildRecentActivities(
      [
        { name: "Objekt A", createdAt: "2026-03-20T10:00:00.000Z" },
        { name: "Objekt B", createdAt: "2026-03-18T10:00:00.000Z" },
      ],
      [
        { title: "Dok A", createdAt: "2026-03-22T09:00:00.000Z" },
        { title: "Dok B", createdAt: "2026-03-19T09:00:00.000Z" },
      ],
      [
        { unitLabel: "WE 01", createdAt: "2026-03-21T09:00:00.000Z" },
        { unitLabel: "WE 02", createdAt: "2026-03-17T09:00:00.000Z" },
      ],
    );

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({
      text: "Dokument hochgeladen: Dok A",
      date: "2026-03-22T09:00:00.000Z",
    });
    expect(result.at(-1)?.text).toBe("WEG angelegt: Objekt B");
  });

  it("counts only documents from the last seven days", () => {
    const now = new Date("2026-03-22T12:00:00.000Z").getTime();
    const result = countRecentDocuments(
      [
        { createdAt: "2026-03-22T11:00:00.000Z" },
        { createdAt: "2026-03-18T11:00:00.000Z" },
        { createdAt: "2026-03-10T11:00:00.000Z" },
        { createdAt: "ungueltig" },
      ],
      now,
    );

    expect(result).toBe(2);
  });

  it("counts contracts with critical status or end dates within ninety days", () => {
    const now = new Date("2026-03-22T12:00:00.000Z").getTime();

    expect(countExpiringContracts([
      { status: "Aktiv", endDate: "2026-04-20" },
      { status: "Aktiv", endDate: "2026-12-31" },
      { status: "Läuft aus", endDate: "2027-12-31" },
      { status: "In Prüfung", endDate: "2027-12-31" },
      { status: "Aktiv", endDate: "ungueltig" },
    ], now)).toBe(3);
  });

  it("counts open document cases from workflow and storage signals", () => {
    expect(countOpenDocumentCases([
      { actionState: "file_missing", status: "Vorhanden" },
      { fileAvailable: false, status: "Vorhanden" },
      { openIssues: ["Keine Zuordnung"], status: "Vorhanden" },
      { status: "In Prüfung" },
      { status: "Vorhanden", fileAvailable: true },
    ])).toBe(4);
  });

  it("counts open reading campaigns by campaign or recipient status", () => {
    expect(countOpenReadingCampaigns([
      { status: "offen", recipients: [] },
      { status: "abgeschlossen", recipients: [{ status: "offen", submittedAt: null }] },
      { status: "abgeschlossen", recipients: [{ status: "eingereicht", submittedAt: "2026-03-22T12:00:00.000Z" }] },
    ])).toBe(2);
  });
});
