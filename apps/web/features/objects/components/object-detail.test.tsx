import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ObjectDetail } from "./object-detail";
import { OBJECT_MODULE_STORAGE_KEYS } from "@/features/finances/utils/nebenkosten-storage";
import type { ImmoDocument } from "@/types/document";
import type { ImmoObject } from "@/types/object";

const object: ImmoObject = {
  id: "obj-1",
  displayId: "WEG-001",
  name: "Sonnenhof",
  address: "Musterstraße 1, 12345 Berlin",
  type: "WEG",
  status: "Aktiv",
  units: 8,
  occupancy: "7/8",
  monthlyTargetRent: "6.200 EUR",
  note: "Testobjekt",
};

const documents: ImmoDocument[] = [
  {
    id: "doc-1",
    title: "Nebenkosten 2025",
    fileName: "nk-2025.pdf",
    mimeType: "application/pdf",
    size: 1024,
    objectId: "obj-1",
    objectName: "WEG-001 · Sonnenhof",
    rentUnitId: "ru-1",
    unitLabel: "WE 01",
    reportYear: 2025,
    category: "Nebenkostenabrechnung",
    status: "Vorhanden",
    uploadedBy: "Udo",
    downloadUrl: "https://example.test/nk-2025.pdf",
    storagePath: "C:\\Dokumente\\nk-2025.pdf",
    fileAvailable: false,
    openIssues: ["Datei fehlt physisch."],
    actionState: "file_missing",
    createdAt: "2026-04-01T09:00:00.000Z",
    updatedAt: "2026-04-02T10:00:00.000Z",
  },
  {
    id: "doc-2",
    title: "Jahresreport 2024",
    fileName: "jahresreport-2024.pdf",
    mimeType: "application/pdf",
    size: 2048,
    objectId: "obj-1",
    objectName: "WEG-001 · Sonnenhof",
    rentUnitId: null,
    unitLabel: null,
    reportYear: 2024,
    category: "Jahresreport WEG",
    status: "Vorhanden",
    uploadedBy: "Udo",
    downloadUrl: "https://example.test/jr-2024.pdf",
    storagePath: "C:\\Dokumente\\jahresreport-2024.pdf",
    fileAvailable: true,
    openIssues: [],
    actionState: null,
    createdAt: "2026-03-01T09:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
  },
  {
    id: "doc-3",
    title: "Fremdes Objekt",
    fileName: "fremd.pdf",
    mimeType: "application/pdf",
    size: 512,
    objectId: "obj-2",
    objectName: "WEG-002 · Nebenhaus",
    rentUnitId: null,
    unitLabel: null,
    reportYear: 2025,
    category: "Mietvertrag",
    status: "Vorhanden",
    uploadedBy: "Udo",
    downloadUrl: "https://example.test/fremd.pdf",
    storagePath: "C:\\Dokumente\\fremd.pdf",
    fileAvailable: true,
    openIssues: [],
    actionState: null,
    createdAt: "2026-03-01T09:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
  },
];

describe("ObjectDetail", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the object document cockpit with filtered object documents", () => {
    render(<ObjectDetail object={object} documents={documents} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Dokumente Objektbezogene Unterlagen an einem Ort bündeln\./,
      }),
    );

    expect(screen.getByText("Alle Dokumente öffnen")).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1",
    );
    expect(screen.getByText("Fehlende Dateien")).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1&fileState=DATEI_FEHLT",
    );
    expect(screen.getByText("Dokumente mit Objektzuordnung")).toBeInTheDocument();
    const totalCard = screen
      .getByText("Dokumente mit Objektzuordnung")
      .closest("div");
    const openCard = screen
      .getByText("Prüfung, fehlende Datei oder fehlende Bereinigung")
      .closest("div");

    expect(totalCard).not.toBeNull();
    expect(openCard).not.toBeNull();
    expect(within(totalCard as HTMLDivElement).getByText("2")).toBeInTheDocument();
    expect(within(openCard as HTMLDivElement).getByText("1")).toBeInTheDocument();
    expect(screen.getByText("1 offene Punkte")).toBeInTheDocument();
    expect(screen.getByText("Nebenkostenabrechnung").closest("a")).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1&category=Nebenkostenabrechnung",
    );
    expect(screen.getByText("2025").closest("a")).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1&reportYear=2025",
    );
    expect(screen.getByText("Nebenkosten 2025")).toBeInTheDocument();
    expect(screen.queryByText("Fremdes Objekt")).not.toBeInTheDocument();
  });

  it("links each apartment directly into its unit-specific document stock", () => {
    window.localStorage.setItem(
      OBJECT_MODULE_STORAGE_KEYS.apartments,
      JSON.stringify({
        "obj-1": [
          {
            id: "ru-1",
            unitLabel: "WE 01",
            designation: "Links",
            area: "78",
            status: "vermietet",
          },
        ],
      }),
    );

    render(<ObjectDetail object={object} documents={documents} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Wohnungen Wohnungsstruktur des Objekts aufbauen und später je Wohnung weiterarbeiten\./,
      }),
    );

    expect(screen.getByText("1 Dokument")).toBeInTheDocument();
    expect(screen.getByText("1 offener Fall")).toBeInTheDocument();
    expect(screen.getByText("Nebenkostenabrechnung · 2025")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dokumente" })).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1&rentUnitId=ru-1",
    );
  });

  it("shows unit document access inside the tenancy workflow", () => {
    window.localStorage.setItem(
      OBJECT_MODULE_STORAGE_KEYS.apartments,
      JSON.stringify({
        "obj-1": [
          {
            id: "ru-1",
            unitLabel: "WE 01",
            designation: "Links",
            area: "78",
            status: "vermietet",
          },
        ],
      }),
    );
    window.localStorage.setItem(
      OBJECT_MODULE_STORAGE_KEYS.tenancies,
      JSON.stringify({
        "obj-1": [
          {
            id: "ten-1",
            apartmentId: "ru-1",
            tenantName: "Max Muster",
            startDate: "2025-01-01",
            endDate: "",
            persons: "2",
          },
        ],
      }),
    );

    render(<ObjectDetail object={object} documents={documents} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Mietverhältnisse Mietverhältnisse im Objektkontext führen und prüfen\./,
      }),
    );

    expect(screen.getByText("Dokumente gesamt")).toBeInTheDocument();
    expect(screen.getByText("Mietverträge")).toBeInTheDocument();
    expect(screen.getByText("Offene Dokumentfälle")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dokumente" })).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1&rentUnitId=ru-1",
    );
    expect(screen.getByRole("link", { name: "Mietvertrag" })).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1&rentUnitId=ru-1&category=Mietvertrag",
    );
  });

  it("shows document access for utility statements inside the utilities workflow", () => {
    render(<ObjectDetail object={object} documents={documents} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Nebenkosten Nebenkosten, Verteilungen und spätere Abrechnungen im Objekt bearbeiten\./,
      }),
    );

    expect(screen.getByText("Dokumente zur Abrechnung")).toBeInTheDocument();
    expect(screen.getAllByText("Nebenkostenabrechnungen").length).toBeGreaterThan(0);
    expect(screen.getByText("Jahresreports WEG")).toBeInTheDocument();
    expect(screen.getByText("Offene Dokumentfälle")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nebenkostenabrechnungen" })).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1&category=Nebenkostenabrechnung",
    );
    expect(screen.getByRole("link", { name: "Jahresreports" })).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1&category=Jahresreport+WEG",
    );
    expect(screen.getByRole("link", { name: "Fehlende Dateien" })).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1&fileState=DATEI_FEHLT",
    );
  });
});
