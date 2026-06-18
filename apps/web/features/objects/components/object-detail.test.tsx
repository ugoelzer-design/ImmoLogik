import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectDetail } from "./object-detail";
import { OBJECT_MODULE_STORAGE_KEYS } from "@/features/finances/utils/nebenkosten-storage";
import type { ImmoDocument } from "@/types/document";
import type { ReadingCampaign } from "@/types/meter-reading";
import type { ImmoObject } from "@/types/object";
import type { Tenant } from "@/types/tenant";
import type { Contract } from "@/types/contract";

const { createMissingDocumentMock } = vi.hoisted(() => ({
  createMissingDocumentMock: vi.fn(),
}));

vi.mock("@/features/documents/services/documents.service", () => ({
  createMissingDocument: createMissingDocumentMock,
}));

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

const tenants: Tenant[] = [
  {
    id: "tenant-1",
    objectId: "obj-1",
    rentUnitId: "ru-1",
    fullName: "Max Muster",
    objectName: "Sonnenhof",
    objectDisplayId: "WEG-001",
    unit: "WE 01",
    email: "max@example.test",
    phone: "",
    status: "Aktiv",
  },
  {
    id: "tenant-2",
    objectId: "obj-1",
    rentUnitId: "ru-2",
    fullName: "Erika Beispiel",
    objectName: "Sonnenhof",
    objectDisplayId: "WEG-001",
    unit: "WE 02",
    email: "erika@example.test",
    phone: "",
    status: "Ausstehend",
  },
];

const contracts: Contract[] = [
  {
    id: "contract-1",
    objectId: "obj-1",
    tenantId: "tenant-1",
    rentUnitId: "ru-1",
    title: "Mietvertrag WE 01",
    objectName: "Sonnenhof",
    objectDisplayId: "WEG-001",
    tenantName: "Max Muster",
    unit: "WE 01",
    startDate: "2025-01-01",
    endDate: "2026-06-30",
    status: "In Prüfung",
  },
];

const readingCampaigns: ReadingCampaign[] = [
  {
    id: "campaign-1",
    objectId: "obj-1",
    reportYear: 2026,
    status: "offen",
    createdAt: "2026-04-01T09:00:00.000Z",
    expiresAt: null,
    object: {
      id: "obj-1",
      displayId: "WEG-001",
      name: "Sonnenhof",
    },
    recipients: [
      {
        id: "access-1",
        tenantId: "tenant-1",
        tenantName: "Max Muster",
        tenantEmail: "max@example.test",
        rentUnitId: "ru-1",
        unitLabel: "WE 01",
        token: "token",
        status: "offen",
        sentAt: "2026-04-01T09:00:00.000Z",
        submittedAt: null,
        expiresAt: null,
      },
    ],
  },
];

describe("ObjectDetail", () => {
  beforeEach(() => {
    window.localStorage.clear();
    createMissingDocumentMock.mockReset();
  });

  it("shows the object dossier with real linked module counts", () => {
    render(
      <ObjectDetail
        object={object}
        documents={documents}
        tenants={tenants}
        contracts={contracts}
        readingCampaigns={readingCampaigns}
      />,
    );

    expect(screen.getByText("Objektakte")).toBeInTheDocument();
    expect(screen.getByText("2 gesamt · 1 aktiv")).toBeInTheDocument();
    expect(screen.getByText("1 gesamt · 0 aktiv")).toBeInTheDocument();
    expect(screen.getByText("2 gesamt · 1 offen")).toBeInTheDocument();
    expect(screen.getByText("1 Mieter ausstehend")).toBeInTheDocument();
    expect(screen.getByText("1 Vertrag/Verträge bald kritisch")).toBeInTheDocument();
    expect(screen.getByText("6 fehlende Pflichtdokumente")).toBeInTheDocument();
    expect(screen.getByText("Nächste Schritte")).toBeInTheDocument();
    expect(screen.getByText("Wohnungsstruktur vervollständigen")).toBeInTheDocument();
    expect(screen.getByText("8 von 8 Einheiten fehlen noch.")).toBeInTheDocument();
    expect(screen.getByText("Pflichtdokumente")).toBeInTheDocument();
    expect(screen.getByText("Jahresreport WEG 2025")).toBeInTheDocument();
    expect(screen.getByText("Mietvertrag WE 01")).toBeInTheDocument();
    expect(screen.getByText("1 offene Ablesekampagnen")).toBeInTheDocument();
    expect(screen.getByText("Dokumentenakte öffnen")).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1",
    );
  });

  it("opens the matching workflow from the next-step cockpit", () => {
    render(
      <ObjectDetail
        object={object}
        documents={documents}
        tenants={tenants}
        contracts={contracts}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Wohnungsstruktur vervollständigen/ }));

    expect(screen.getByText("Arbeitsmodus:")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Wohnungen" })).toBeInTheDocument();
  });

  it("creates a missing document placeholder from a required document gap", async () => {
    createMissingDocumentMock.mockResolvedValueOnce({
      ok: true,
      document: {
        ...documents[1],
        id: "doc-required-created",
        title: "Jahresreport WEG 2025",
        fileName: "fehlend_Jahresreport_WEG_2025.missing",
        reportYear: 2025,
        status: "Fehlt",
        fileAvailable: false,
        openIssues: ["Dokument ist fachlich als fehlend markiert"],
        actionState: "file_missing",
      },
    });

    render(
      <ObjectDetail
        object={object}
        documents={documents}
        tenants={tenants}
        contracts={contracts}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Als fehlend anlegen" })[0]);

    await waitFor(() => {
      expect(createMissingDocumentMock).toHaveBeenCalledWith({
        objectId: "obj-1",
        rentUnitId: undefined,
        reportYear: "2025",
        category: "Jahresreport WEG",
        title: "Jahresreport WEG 2025",
        uploadedBy: "Pflichtlogik",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("5 fehlende Pflichtdokumente")).toBeInTheDocument();
    });
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
    expect(screen.getByText("Gesamtfläche")).toBeInTheDocument();
    expect(screen.getAllByText("78 m²").length).toBeGreaterThan(0);
    expect(screen.getByText("Offene Aktenfälle")).toBeInTheDocument();
    expect(screen.queryByText("Akte noch leer")).not.toBeInTheDocument();
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
