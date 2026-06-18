import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentsModule } from "./documents-module";
import type { ImmoDocument } from "@/types/document";

const { getDocumentsMock, getDownloadUrlMock, getDocumentStorageStatusMock, exportDocumentsInventoryMock, uploadDocumentMock, attachFileToDocumentMock, createMissingDocumentMock, deleteDocumentMock, updateDocumentStatusMock, updateDocumentMetadataMock } = vi.hoisted(() => ({
  getDocumentsMock: vi.fn(),
  getDownloadUrlMock: vi.fn(),
  getDocumentStorageStatusMock: vi.fn(),
  exportDocumentsInventoryMock: vi.fn(),
  uploadDocumentMock: vi.fn(),
  attachFileToDocumentMock: vi.fn(),
  createMissingDocumentMock: vi.fn(),
  deleteDocumentMock: vi.fn(),
  updateDocumentStatusMock: vi.fn(),
  updateDocumentMetadataMock: vi.fn(),
}));

vi.mock("@/features/documents/services/documents.service", () => ({
  getDocuments: getDocumentsMock,
  getDownloadUrl: getDownloadUrlMock,
  getDocumentStorageStatus: getDocumentStorageStatusMock,
  exportDocumentsInventory: exportDocumentsInventoryMock,
  uploadDocument: uploadDocumentMock,
  attachFileToDocument: attachFileToDocumentMock,
  createMissingDocument: createMissingDocumentMock,
  deleteDocument: deleteDocumentMock,
  updateDocumentStatus: updateDocumentStatusMock,
  updateDocumentMetadata: updateDocumentMetadataMock,
}));

const baseDocument: ImmoDocument = {
  id: "doc-1",
  title: "Mietvertrag Weber",
  fileName: "mietvertrag.pdf",
  mimeType: "application/pdf",
  size: 2048,
  objectId: "obj-1",
  objectName: "WEG-001 · Sonnenhof",
  rentUnitId: "ru-1",
  unitLabel: "WE 01",
  reportYear: 2025,
  category: "Mietvertrag",
  status: "Vorhanden",
  uploadedBy: "Max Mustermann",
  downloadUrl: "https://example.test/mietvertrag.pdf",
  storagePath: "C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente\\wegs\\WEG-001_Sonnenhof\\wohnungen\\WE_01\\historie\\2025\\Mietvertrag\\mietvertrag.pdf",
  fileAvailable: true,
  openIssues: [],
  actionState: null,
  createdAt: "2026-03-20T12:00:00.000Z",
  updatedAt: "2026-03-20T12:00:00.000Z",
};

const secondDocument: ImmoDocument = {
  ...baseDocument,
  id: "doc-2",
  title: "Nebenkosten Einheit 02",
  fileName: "nebenkosten-we02.pdf",
  rentUnitId: "ru-2",
  unitLabel: "WE 02",
  reportYear: 2024,
  category: "Nebenkostenabrechnung",
};

const objects = [{ id: "obj-1", displayId: "WEG-001", name: "Sonnenhof" }];
const rentUnits = [
  { id: "ru-1", objectId: "obj-1", unitLabel: "WE 01", tenant: "Anna", sollMiete: 1000, istMiete: 1000, zahlungsStatus: "Bezahlt", faelligAm: "2026-04-01" },
  { id: "ru-2", objectId: "obj-1", unitLabel: "WE 02", tenant: "Ben", sollMiete: 1100, istMiete: 1100, zahlungsStatus: "Bezahlt", faelligAm: "2026-04-01" },
];

describe("DocumentsModule", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("open", vi.fn());
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:documents-export"),
      revokeObjectURL: vi.fn(),
    });
    getDocumentsMock.mockResolvedValue([]);
    getDocumentStorageStatusMock.mockResolvedValue(null);
    exportDocumentsInventoryMock.mockResolvedValue({
      ok: true,
      data: new Blob(["id;title"], { type: "text/csv;charset=utf-8" }),
    });
  });

  it("renders stats and updates a document status", async () => {
    updateDocumentStatusMock.mockResolvedValueOnce({
      ok: true,
      data: {
        ...baseDocument,
        status: "In Prüfung",
        updatedAt: "2026-03-24T10:30:00.000Z",
      },
    });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    expect(screen.getByRole("heading", { name: "Dokumente" })).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    expect(screen.getByText("1 von 1 Dokumenten")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Vorhanden"), {
      target: { value: "In Prüfung" },
    });

    await waitFor(() => {
      expect(updateDocumentStatusMock).toHaveBeenCalledWith("doc-1", "In Prüfung");
    });

    expect(screen.getByDisplayValue("In Prüfung")).toBeInTheDocument();
    expect(screen.getByText(/Zuletzt geändert 24.03.2026, 11:30/)).toBeInTheDocument();
  });

  it("shows the active filesystem storage path when document storage runs via OneDrive", async () => {
    getDocumentStorageStatusMock.mockResolvedValueOnce({
      mode: "filesystem",
      rootPath: "C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente",
      available: true,
    });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    expect(await screen.findByText("Ablage aktiv: C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente")).toBeInTheDocument();
  });

  it("shows a warning when document storage does not run via OneDrive/filesystem", async () => {
    getDocumentStorageStatusMock.mockResolvedValueOnce({
      mode: "s3",
      rootPath: "immologik-local",
      available: true,
    });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    expect(await screen.findByText("Ablage läuft aktuell nicht über OneDrive/Dateisystem.")).toBeInTheDocument();
  });

  it("exports the current document inventory directly from the header", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "Bestand exportieren" }));

    await waitFor(() => {
      expect(exportDocumentsInventoryMock).toHaveBeenCalledTimes(1);
    });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:documents-export");

    clickSpy.mockRestore();
  });

  it("blocks uploads visibly when the OneDrive storage is unavailable", async () => {
    getDocumentStorageStatusMock.mockResolvedValueOnce({
      mode: "filesystem",
      rootPath: "C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente",
      available: false,
    });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    expect(await screen.findByText("Ablage nicht verfügbar: C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Dokument erfassen" })).toBeEnabled();
  });

  it("allows creating a missing document entry without a file", async () => {
    createMissingDocumentMock.mockResolvedValueOnce({
      ok: true,
      document: {
        ...baseDocument,
        id: "doc-missing-new",
        title: "Nebenkosten 2025 fehlt",
        fileName: "fehlend_Nebenkosten_2025_fehlt.missing",
        size: 0,
        category: "Nebenkostenabrechnung",
        status: "Fehlt",
        reportYear: 2025,
        fileAvailable: false,
        downloadUrl: null,
        openIssues: ["Datei fehlt in der Ablage", "Dokument ist fachlich als fehlend markiert"],
        actionState: "file_missing",
      },
    });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));
    fireEvent.change(screen.getByPlaceholderText("Dokumententitel"), {
      target: { value: "Nebenkosten 2025 fehlt" },
    });
    fireEvent.change(screen.getByDisplayValue("Sonstiges"), {
      target: { value: "Nebenkostenabrechnung" },
    });
    fireEvent.change(screen.getByPlaceholderText("z. B. 2025"), {
      target: { value: "2025" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fehlend anlegen" }));

    await waitFor(() => {
      expect(createMissingDocumentMock).toHaveBeenCalledWith({
        title: "Nebenkosten 2025 fehlt",
        category: "Nebenkostenabrechnung",
        objectId: undefined,
        rentUnitId: undefined,
        reportYear: "2025",
        uploadedBy: undefined,
      });
    });

    expect(screen.getAllByText("Nebenkosten 2025 fehlt")[0]).toBeInTheDocument();
  });

  it("loads a missing download url on demand and opens the document", async () => {
    getDownloadUrlMock.mockResolvedValueOnce({ ok: true, data: "https://example.test/fallback.pdf" });

    render(<DocumentsModule initialDocuments={[{ ...baseDocument, downloadUrl: null }]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "↓ Download" }));

    await waitFor(() => {
      expect(getDownloadUrlMock).toHaveBeenCalledWith("doc-1");
    });

    expect(window.open).toHaveBeenCalledWith("https://example.test/fallback.pdf", "_blank", "noopener,noreferrer");
  });

  it("shows document details and activity entries on demand", () => {
    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    expect(screen.getByText("Dokumentdetails")).toBeInTheDocument();
    expect(screen.getByText("Arbeitskontext")).toBeInTheDocument();
    expect(screen.getByText("Aktivität")).toBeInTheDocument();
    expect(screen.getByText("Hochgeladen")).toBeInTheDocument();
    expect(screen.getByText("Workflow")).toBeInTheDocument();
    expect(screen.getByText("Upload durch Max Mustermann")).toBeInTheDocument();
    expect(screen.getByText(baseDocument.storagePath as string)).toBeInTheDocument();
    expect(screen.getByText("Datei in der Ablage vorhanden")).toBeInTheDocument();
    expect(screen.getByText("Im selben Objekt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Objekt filtern" })).toBeInTheDocument();
  });

  it("shows missing physical files in the document details and disables download", () => {
    render(<DocumentsModule initialDocuments={[{ ...baseDocument, fileAvailable: false, downloadUrl: null }]} objects={objects} rentUnits={rentUnits} />);

    expect(screen.getByRole("button", { name: "Datei fehlt" })).toBeDisabled();
    expect(screen.getByText("1 Datei fehlt aktuell in der Ablage.")).toBeInTheDocument();
    expect(screen.getAllByText("Datei fehlt")[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    expect(screen.getByText("Datei fehlt in der Ablage")).toBeInTheDocument();
  });

  it("shows open document issues in the details area", () => {
    render(<DocumentsModule initialDocuments={[{
      ...baseDocument,
      openIssues: ["Dokument wartet auf Prüfung", "Datei fehlt in der Ablage"],
      actionState: "file_missing",
      fileAvailable: false,
      downloadUrl: null,
    }]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    expect(screen.getByText("Offene Punkte")).toBeInTheDocument();
    expect(screen.getByText("Dokument wartet auf Prüfung")).toBeInTheDocument();
    expect(screen.getAllByText("Datei fehlt in der Ablage")[0]).toBeInTheDocument();
  });

  it("offers clickable status and category overview filters", async () => {
    getDocumentsMock.mockResolvedValueOnce([baseDocument, secondDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    const statusOverview = screen.getByText("Status-Überblick").closest("div.rounded-2xl");
    expect(statusOverview).not.toBeNull();
    fireEvent.click(within(statusOverview as HTMLElement).getByRole("button", { name: /Vorhanden/ }));

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        status: "Vorhanden",
      });
    });

    expect(screen.getByText("Status: Vorhanden")).toBeInTheDocument();

    getDocumentsMock.mockResolvedValueOnce([secondDocument]);
    const categoryOverview = screen.getByText("Kategorie-Überblick").closest("div.rounded-2xl");
    expect(categoryOverview).not.toBeNull();
    fireEvent.click(within(categoryOverview as HTMLElement).getByRole("button", { name: /Nebenkostenabrechnung/ }));

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        category: "Nebenkostenabrechnung",
        status: "Vorhanden",
      });
    });

    expect(screen.getByText("Kategorie: Nebenkostenabrechnung")).toBeInTheDocument();
  });

  it("surfaces prioritized document cases from the visible list", () => {
    render(<DocumentsModule initialDocuments={[{
      ...baseDocument,
      id: "doc-missing-priority",
      title: "Jahresreport fehlt",
      status: "Fehlt",
      fileAvailable: false,
      actionState: "file_missing",
      openIssues: ["Datei fehlt in der Ablage"],
    }]} objects={objects} rentUnits={rentUnits} />);

    expect(screen.getByText("Priorität")).toBeInTheDocument();
    expect(screen.getAllByText("Jahresreport fehlt")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Datei fehlt")[0]).toBeInTheDocument();
  });

  it("allows attaching a physical file to an existing missing document", async () => {
    attachFileToDocumentMock.mockResolvedValueOnce({
      ok: true,
      document: {
        ...baseDocument,
        id: "doc-attach",
        title: "Jahresreport 2025 fehlt",
        fileName: "jahresreport-2025.pdf",
        mimeType: "application/pdf",
        size: 2048,
        category: "Jahresreport WEG",
        status: "Vorhanden",
        reportYear: 2025,
        fileAvailable: true,
        downloadUrl: "https://example.test/jr-2025.pdf",
        openIssues: [],
        actionState: null,
      },
    });

    render(<DocumentsModule initialDocuments={[{
      ...baseDocument,
      id: "doc-attach",
      title: "Jahresreport 2025 fehlt",
      fileName: "fehlend_Jahresreport_2025_fehlt.missing",
      mimeType: "application/x-immologik-missing-document",
      size: 0,
      category: "Jahresreport WEG",
      status: "Fehlt",
      reportYear: 2025,
      fileAvailable: false,
      downloadUrl: null,
      openIssues: ["Datei fehlt in der Ablage", "Dokument ist fachlich als fehlend markiert"],
      actionState: "file_missing",
    }]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    const file = new File(["report"], "jahresreport-2025.pdf", { type: "application/pdf" });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Datei nachreichen" }));

    await waitFor(() => {
      expect(attachFileToDocumentMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("jahresreport-2025.pdf")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Vorhanden")).toBeInTheDocument();
  });

  it("filters documents by missing file state via the api path", async () => {
    getDocumentsMock.mockResolvedValueOnce([{ ...baseDocument, id: "doc-missing", fileAvailable: false, downloadUrl: null }]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(screen.getByDisplayValue("Alle Ablagen"), {
      target: { value: "DATEI_FEHLT" },
    });

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        objectId: undefined,
        rentUnitId: undefined,
        category: undefined,
        status: undefined,
        fileState: "missing",
        reportYear: undefined,
        search: undefined,
      });
    });

    expect(screen.getByText("Ablage: Datei fehlt")).toBeInTheDocument();
  });

  it("filters documents by open action state via the api path", async () => {
    getDocumentsMock.mockResolvedValueOnce([{
      ...baseDocument,
      id: "doc-review",
      status: "In Prüfung",
      openIssues: ["Dokument wartet auf Prüfung"],
      actionState: "review_pending",
    }]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(screen.getByDisplayValue("Alle offenen Fälle"), {
      target: { value: "review_pending" },
    });

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        actionState: "review_pending",
      });
    });

    expect(screen.getByText("Offener Fall: In Prüfung")).toBeInTheDocument();
  });

  it("applies object and unit filters directly from the document details", async () => {
    getDocumentsMock
      .mockResolvedValueOnce([baseDocument, secondDocument])
      .mockResolvedValueOnce([baseDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Details" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Einheit filtern" }));

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        objectId: "obj-1",
        rentUnitId: "ru-1",
        category: undefined,
        status: undefined,
        reportYear: undefined,
        search: undefined,
      });
    });

    expect(screen.getByText("Objekt: WEG-001")).toBeInTheDocument();
    expect(screen.getByText("Einheit: WE 01")).toBeInTheDocument();
  });

  it("applies category and year filters directly from the document details", async () => {
    getDocumentsMock
      .mockResolvedValueOnce([baseDocument])
      .mockResolvedValueOnce([baseDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    fireEvent.click(screen.getByRole("button", { name: "Kategorie filtern" }));

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        objectId: undefined,
        rentUnitId: undefined,
        category: "Mietvertrag",
        status: undefined,
        reportYear: undefined,
        search: undefined,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Jahr filtern" }));

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        objectId: undefined,
        rentUnitId: undefined,
        category: "Mietvertrag",
        status: undefined,
        reportYear: "2025",
        search: undefined,
      });
    });

    expect(screen.getByText("Kategorie: Mietvertrag")).toBeInTheDocument();
    expect(screen.getByText("Jahr: 2025")).toBeInTheDocument();
  });

  it("updates the visible activity block after a status change", async () => {
    updateDocumentStatusMock.mockResolvedValueOnce({
      ok: true,
      data: {
        ...baseDocument,
        status: "In Prüfung",
        updatedAt: "2026-03-24T10:30:00.000Z",
      },
    });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    const documentRow = screen.getByText("Mietvertrag Weber").closest("div.grid");
    expect(documentRow).not.toBeNull();

    fireEvent.change(within(documentRow as HTMLElement).getByDisplayValue("Vorhanden"), {
      target: { value: "In Prüfung" },
    });

    await waitFor(() => {
      expect(updateDocumentStatusMock).toHaveBeenCalledWith("doc-1", "In Prüfung");
    });

    expect(screen.getByText("Zuletzt bearbeitet")).toBeInTheDocument();
    expect(screen.getByText("Aktueller Status: In Prüfung")).toBeInTheDocument();
  });

  it("shows an action error when the fallback download url cannot be loaded", async () => {
    getDownloadUrlMock.mockResolvedValueOnce({ ok: false, error: "Datei in OneDrive nicht gefunden." });

    render(<DocumentsModule initialDocuments={[{ ...baseDocument, downloadUrl: null }]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "↓ Download" }));

    expect(await screen.findByText("Datei in OneDrive nicht gefunden.")).toBeInTheDocument();
  });

  it("deletes a document row after confirmation", async () => {
    deleteDocumentMock.mockResolvedValueOnce({ ok: true, data: true });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "✕" }));

    await waitFor(() => {
      expect(deleteDocumentMock).toHaveBeenCalledWith("doc-1");
    });

    expect(screen.queryByText("Mietvertrag Weber")).not.toBeInTheDocument();
    expect(screen.getByText("Noch keine Dokumente vorhanden.")).toBeInTheDocument();
  });

  it("shows an error when upload starts without a selected file", async () => {
    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));
    fireEvent.click(screen.getByRole("button", { name: "Mit Datei hochladen" }));

    expect(await screen.findByText("Bitte eine Datei auswählen.")).toBeInTheDocument();
    expect(uploadDocumentMock).not.toHaveBeenCalled();
  });

  it("shows action errors outside the forms when a status update fails", async () => {
    updateDocumentStatusMock.mockResolvedValueOnce({ ok: false, error: "Ungültiger Dokumentstatus." });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    const documentRow = screen.getByText("Mietvertrag Weber").closest("div.grid");
    expect(documentRow).not.toBeNull();

    fireEvent.change(within(documentRow as HTMLElement).getByDisplayValue("Vorhanden"), {
      target: { value: "In Prüfung" },
    });

    expect(await screen.findByText("Ungültiger Dokumentstatus.")).toBeInTheDocument();
  });

  it("keeps edit validation errors inside the edit form", async () => {
    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    fireEvent.change(screen.getByDisplayValue("Mietvertrag Weber"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));

    const editPanel = screen.getByText("Dokument bearbeiten").closest("div.rounded-2xl");
    expect(editPanel).not.toBeNull();
    expect(within(editPanel as HTMLElement).getByText("Bitte einen Dokumenttitel angeben.")).toBeInTheDocument();
  });

  it("requires a report year for annual reports before uploading", async () => {
    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));
    fireEvent.change(screen.getByDisplayValue("Sonstiges"), {
      target: { value: "Jahresreport Wohnung" },
    });
    fireEvent.change(screen.getByPlaceholderText("z. B. 2025"), {
      target: { value: "25" },
    });

    const file = new File(["report"], "report.pdf", { type: "application/pdf" });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mit Datei hochladen" }));

    expect(await screen.findByText("Für Jahresreports und Nebenkostenabrechnungen bitte ein gültiges 4-stelliges Berichtsjahr angeben.")).toBeInTheDocument();
    expect(uploadDocumentMock).not.toHaveBeenCalled();
  });

  it("finds documents by visible object id in the search field", () => {
    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(
      screen.getByPlaceholderText("Suche nach Titel, Objekt-ID, Wohnung oder Jahr..."),
      { target: { value: "WEG-001" } },
    );

    expect(screen.getByText("Mietvertrag Weber")).toBeInTheDocument();
    expect(screen.getByText("1 von 1 Dokumenten")).toBeInTheDocument();
  });

  it("derives visible object id and unit label for legacy document rows", () => {
    const legacyDocument: ImmoDocument = {
      ...baseDocument,
      objectName: "Sonnenhof",
      unitLabel: null,
    };

    render(<DocumentsModule initialDocuments={[legacyDocument]} objects={objects} rentUnits={rentUnits} />);

    const documentRow = screen.getByText("Mietvertrag Weber").closest("div.grid");
    expect(documentRow).not.toBeNull();

    expect(within(documentRow as HTMLElement).getByText("WEG-001 · Sonnenhof")).toBeInTheDocument();
    expect(within(documentRow as HTMLElement).getByText("WE 01")).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("Suche nach Titel, Objekt-ID, Wohnung oder Jahr..."),
      { target: { value: "WEG-001" } },
    );

    expect(screen.getByText("Mietvertrag Weber")).toBeInTheDocument();
  });

  it("filters documents by selected rent unit", async () => {
    getDocumentsMock.mockResolvedValueOnce([secondDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(screen.getByDisplayValue("Alle Einheiten"), {
      target: { value: "ru-2" },
    });

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        objectId: undefined,
        rentUnitId: "ru-2",
        category: undefined,
        status: undefined,
        reportYear: undefined,
        search: undefined,
      });
    });

    expect(screen.queryByText("Mietvertrag Weber")).not.toBeInTheDocument();
    expect(screen.getByText("Nebenkosten Einheit 02")).toBeInTheDocument();
    expect(screen.getByText("1 von 1 Dokumenten")).toBeInTheDocument();
  });

  it("reloads documents from the api when object or unit filters change", async () => {
    getDocumentsMock
      .mockResolvedValueOnce([baseDocument, secondDocument])
      .mockResolvedValueOnce([secondDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(screen.getByDisplayValue("Alle Objekte"), {
      target: { value: "obj-1" },
    });
    fireEvent.change(screen.getByDisplayValue("Alle Einheiten"), {
      target: { value: "ru-2" },
    });

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        objectId: "obj-1",
        rentUnitId: "ru-2",
        category: undefined,
        status: undefined,
        reportYear: undefined,
        search: undefined,
      });
    });

    expect(await screen.findByText("Nebenkosten Einheit 02")).toBeInTheDocument();
    expect(screen.queryByText("Mietvertrag Weber")).not.toBeInTheDocument();
  });

  it("reloads documents with category, status and year filters", async () => {
    getDocumentsMock.mockResolvedValueOnce([secondDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(screen.getByDisplayValue("Alle Kategorien"), {
      target: { value: "Nebenkostenabrechnung" },
    });
    fireEvent.change(screen.getByDisplayValue("Alle Status"), {
      target: { value: "Vorhanden" },
    });
    fireEvent.change(screen.getByDisplayValue("Alle Jahre"), {
      target: { value: "2025" },
    });

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        objectId: undefined,
        rentUnitId: undefined,
        category: "Nebenkostenabrechnung",
        status: "Vorhanden",
        reportYear: "2025",
        search: undefined,
      });
    });
  });

  it("reloads documents via api when a search term is entered", async () => {
    getDocumentsMock.mockResolvedValueOnce([baseDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(
      screen.getByPlaceholderText("Suche nach Titel, Objekt-ID, Wohnung oder Jahr..."),
      { target: { value: "WEG-001" } },
    );

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        objectId: undefined,
        rentUnitId: undefined,
        category: undefined,
        status: undefined,
        reportYear: undefined,
        search: "WEG-001",
      });
    });
  });

  it("shows active filter summary chips for search and selected filters", async () => {
    getDocumentsMock.mockResolvedValueOnce([baseDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(
      screen.getByPlaceholderText("Suche nach Titel, Objekt-ID, Wohnung oder Jahr..."),
      { target: { value: "WEG-001" } },
    );
    fireEvent.change(screen.getByDisplayValue("Alle Kategorien"), {
      target: { value: "Mietvertrag" },
    });

    expect(await screen.findByText("Suche: WEG-001")).toBeInTheDocument();
    expect(screen.getByText("Kategorie: Mietvertrag")).toBeInTheDocument();
  });

  it("allows removing active filters directly from the summary chips", async () => {
    getDocumentsMock
      .mockResolvedValueOnce([baseDocument])
      .mockResolvedValueOnce([baseDocument, secondDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(
      screen.getByPlaceholderText("Suche nach Titel, Objekt-ID, Wohnung oder Jahr..."),
      { target: { value: "WEG-001" } },
    );
    fireEvent.change(screen.getByDisplayValue("Alle Kategorien"), {
      target: { value: "Mietvertrag" },
    });

    expect(await screen.findByText("Suche: WEG-001")).toBeInTheDocument();
    expect(screen.getByText("Kategorie: Mietvertrag")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Kategorie: Mietvertrag entfernen" }));

    await waitFor(() => {
      expect(screen.queryByText("Kategorie: Mietvertrag")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Suche: WEG-001 entfernen" }));

    await waitFor(() => {
      expect((screen.getByPlaceholderText("Suche nach Titel, Objekt-ID, Wohnung oder Jahr...") as HTMLInputElement).value).toBe("");
    });
  });

  it("resets search and filters to the default state", async () => {
    getDocumentsMock
      .mockResolvedValueOnce([secondDocument])
      .mockResolvedValueOnce([baseDocument, secondDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(
      screen.getByPlaceholderText("Suche nach Titel, Objekt-ID, Wohnung oder Jahr..."),
      { target: { value: "WEG-001" } },
    );
    fireEvent.change(screen.getByDisplayValue("Alle Kategorien"), {
      target: { value: "Nebenkostenabrechnung" },
    });

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        objectId: undefined,
        rentUnitId: undefined,
        category: "Nebenkostenabrechnung",
        status: undefined,
        reportYear: undefined,
        search: "WEG-001",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Filter zuruecksetzen" }));

    expect((screen.getByPlaceholderText("Suche nach Titel, Objekt-ID, Wohnung oder Jahr...") as HTMLInputElement).value).toBe("");
    expect(screen.getByDisplayValue("Alle Kategorien")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alle Status")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alle Jahre")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alle Objekte")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alle Einheiten")).toBeInTheDocument();
  });

  it("shows a guided empty state when no document matches the active filters", async () => {
    getDocumentsMock.mockResolvedValueOnce([]);

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(screen.getByDisplayValue("Alle Kategorien"), {
      target: { value: "Rechnung" },
    });

    expect(await screen.findByText("Keine Dokumente passen zur aktuellen Suche oder Filterkombination.")).toBeInTheDocument();
    expect(screen.getByText("Pruefe die aktiven Filter oder setze sie gesammelt zurueck.")).toBeInTheDocument();
  });

  it("shows a reload error and keeps the current list when filtered loading fails", async () => {
    getDocumentsMock.mockRejectedValueOnce(new Error("network"));

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(screen.getByDisplayValue("Alle Kategorien"), {
      target: { value: "Rechnung" },
    });

    expect(await screen.findByText("Dokumente konnten für den aktuellen Filter nicht neu geladen werden.")).toBeInTheDocument();
    expect(screen.getByText("Mietvertrag Weber")).toBeInTheDocument();
  });

  it("keeps local status changes when filters return to all documents", async () => {
    updateDocumentStatusMock.mockResolvedValueOnce({
      ok: true,
      data: {
        ...baseDocument,
        status: "In Prüfung",
        updatedAt: "2026-03-24T10:30:00.000Z",
      },
    });
    getDocumentsMock.mockResolvedValueOnce([baseDocument, secondDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    const firstDocumentRow = screen.getByText("Mietvertrag Weber").closest("div.grid");
    expect(firstDocumentRow).not.toBeNull();

    fireEvent.change(within(firstDocumentRow as HTMLElement).getByDisplayValue("Vorhanden"), {
      target: { value: "In Prüfung" },
    });

    await waitFor(() => {
      expect(updateDocumentStatusMock).toHaveBeenCalledWith("doc-1", "In Prüfung");
    });

    fireEvent.change(screen.getByDisplayValue("Alle Objekte"), {
      target: { value: "obj-1" },
    });

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenCalledWith({
        objectId: "obj-1",
        rentUnitId: undefined,
        category: undefined,
        status: undefined,
        reportYear: undefined,
        search: undefined,
      });
    });

    fireEvent.change(screen.getByDisplayValue("WEG-001 · Sonnenhof"), {
      target: { value: "ALLE" },
    });

    await waitFor(() => {
      expect(screen.getAllByDisplayValue("In Prüfung")).toHaveLength(1);
    });
  });

  it("prefills upload assignment from active object and unit filters", async () => {
    getDocumentsMock
      .mockResolvedValueOnce([baseDocument, secondDocument])
      .mockResolvedValueOnce([secondDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(screen.getByDisplayValue("Alle Objekte"), {
      target: { value: "obj-1" },
    });
    fireEvent.change(screen.getByDisplayValue("Alle Einheiten"), {
      target: { value: "ru-2" },
    });
    fireEvent.change(screen.getByDisplayValue("Alle Kategorien"), {
      target: { value: "Nebenkostenabrechnung" },
    });
    fireEvent.change(screen.getByDisplayValue("Alle Jahre"), {
      target: { value: "2025" },
    });

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        objectId: "obj-1",
        rentUnitId: "ru-2",
        category: "Nebenkostenabrechnung",
        status: undefined,
        reportYear: "2025",
        search: undefined,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));

    const uploadHeading = await screen.findByText("Dokument erfassen");
    const uploadPanel = uploadHeading.closest("div.rounded-2xl");
    expect(uploadPanel).not.toBeNull();

    expect(within(uploadPanel as HTMLElement).getByDisplayValue("WEG-001 · Sonnenhof")).toBeInTheDocument();
    expect(within(uploadPanel as HTMLElement).getByDisplayValue("WE 02")).toBeInTheDocument();
    expect(within(uploadPanel as HTMLElement).getByDisplayValue("Nebenkostenabrechnung")).toBeInTheDocument();
    expect(within(uploadPanel as HTMLElement).getByDisplayValue("2025")).toBeInTheDocument();
    expect(within(uploadPanel as HTMLElement).getByText("Aktuelle Zuordnung: WEG-001 · Sonnenhof / WE 02")).toBeInTheDocument();
  });

  it("reopens the upload form with the current filter context instead of stale previous values", async () => {
    getDocumentsMock.mockResolvedValueOnce([secondDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(screen.getByDisplayValue("Alle Kategorien"), {
      target: { value: "Nebenkostenabrechnung" },
    });
    fireEvent.change(screen.getByDisplayValue("Alle Jahre"), {
      target: { value: "2025" },
    });

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenLastCalledWith({
        objectId: undefined,
        rentUnitId: undefined,
        category: "Nebenkostenabrechnung",
        status: undefined,
        reportYear: "2025",
        search: undefined,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));
    const firstUploadHeading = await screen.findByText("Dokument erfassen");
    const firstUploadPanel = firstUploadHeading.closest("div.rounded-2xl");
    expect(firstUploadPanel).not.toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Dokumententitel"), {
      target: { value: "Manuelle Eingabe" },
    });
    fireEvent.change(within(firstUploadPanel as HTMLElement).getByDisplayValue("Nebenkostenabrechnung"), {
      target: { value: "Foto" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));

    const uploadHeading = await screen.findByText("Dokument erfassen");
    const uploadPanel = uploadHeading.closest("div.rounded-2xl");
    expect(uploadPanel).not.toBeNull();

    expect(within(uploadPanel as HTMLElement).getByDisplayValue("Nebenkostenabrechnung")).toBeInTheDocument();
    expect(within(uploadPanel as HTMLElement).getByDisplayValue("2025")).toBeInTheDocument();
    expect((within(uploadPanel as HTMLElement).getByPlaceholderText("Dokumententitel") as HTMLInputElement).value).toBe("");
  });

  it("closes the edit form when the upload form is opened", () => {
    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    expect(screen.getByText("Dokument bearbeiten")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));

    expect(screen.queryByText("Dokument bearbeiten")).not.toBeInTheDocument();
    expect(screen.getByText("Dokument erfassen")).toBeInTheDocument();
  });

  it("closes the upload form when editing a document starts", () => {
    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));
    expect(screen.getByText("Dokument erfassen")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(screen.queryByText("Dokument erfassen")).not.toBeInTheDocument();
    expect(screen.getByText("Dokument bearbeiten")).toBeInTheDocument();
  });

  it("submits uploadedBy with the upload form", async () => {
    uploadDocumentMock.mockResolvedValueOnce({
      ok: true,
      document: {
        ...baseDocument,
        id: "doc-3",
        title: "Neuer Bericht",
        uploadedBy: "Clara Beispiel",
      },
    });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));
    fireEvent.change(screen.getByPlaceholderText("Dokumententitel"), {
      target: { value: "Neuer Bericht" },
    });
    fireEvent.change(screen.getByPlaceholderText("z. B. Max Mustermann"), {
      target: { value: "Clara Beispiel" },
    });

    const file = new File(["report"], "report.pdf", { type: "application/pdf" });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mit Datei hochladen" }));

    await waitFor(() => {
      expect(uploadDocumentMock).toHaveBeenCalledTimes(1);
    });

    const formData = uploadDocumentMock.mock.calls[0][0] as FormData;
    expect(formData.get("uploadedBy")).toBe("Clara Beispiel");
    expect(screen.getByText("Neuer Bericht")).toBeInTheDocument();
    expect(screen.getByText(/Hochgeladen von Clara Beispiel/)).toBeInTheDocument();
  });

  it("shows a duplicate warning from the upload path", async () => {
    uploadDocumentMock.mockResolvedValueOnce({
      ok: false,
      error: "Ein gleiches Dokument ist für dieselbe Zuordnung bereits vorhanden.",
    });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));
    fireEvent.change(screen.getByPlaceholderText("Dokumententitel"), {
      target: { value: "Mietvertrag Weber" },
    });

    const file = new File(["report"], "mietvertrag.pdf", { type: "application/pdf" });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mit Datei hochladen" }));

    expect(await screen.findByText("Ein gleiches Dokument ist für dieselbe Zuordnung bereits vorhanden.")).toBeInTheDocument();
  });

  it("keeps the document list sorted by report year and created date after an upload", async () => {
    uploadDocumentMock.mockResolvedValueOnce({
      ok: true,
      document: {
        ...baseDocument,
        id: "doc-8",
        title: "Altes Foto",
        category: "Foto",
        reportYear: 2023,
        createdAt: "2026-03-25T09:00:00.000Z",
        updatedAt: "2026-03-25T09:00:00.000Z",
      },
    });

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));
    fireEvent.change(screen.getByDisplayValue("Sonstiges"), {
      target: { value: "Foto" },
    });
    fireEvent.change(screen.getByPlaceholderText("Dokumententitel"), {
      target: { value: "Altes Foto" },
    });

    const file = new File(["img"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mit Datei hochladen" }));

    await waitFor(() => {
      expect(uploadDocumentMock).toHaveBeenCalledTimes(1);
    });

    const visibleTitles = screen
      .getAllByText(/Mietvertrag Weber|Nebenkosten Einheit 02|Altes Foto/)
      .filter((node) => node.tagName === "P")
      .map((node) => node.textContent);

    expect(visibleTitles.slice(0, 3)).toEqual([
      "Mietvertrag Weber",
      "Nebenkosten Einheit 02",
      "Altes Foto",
    ]);
  });

  it("does not submit a report year for optional document categories by default", async () => {
    uploadDocumentMock.mockResolvedValueOnce({
      ok: true,
      document: {
        ...baseDocument,
        id: "doc-4",
        title: "Foto Eingang",
        category: "Foto",
        reportYear: null,
      },
    });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));
    fireEvent.change(screen.getByDisplayValue("Sonstiges"), {
      target: { value: "Foto" },
    });
    fireEvent.change(screen.getByPlaceholderText("Dokumententitel"), {
      target: { value: "Foto Eingang" },
    });

    const file = new File(["img"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mit Datei hochladen" }));

    await waitFor(() => {
      expect(uploadDocumentMock).toHaveBeenCalledTimes(1);
    });

    const formData = uploadDocumentMock.mock.calls[0][0] as FormData;
    expect(formData.get("reportYear")).toBeNull();
  });

  it("prefills the current year when a required category is selected in the upload form", () => {
    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Dokument erfassen" }));

    const reportYearInput = screen.getByPlaceholderText("z. B. 2025") as HTMLInputElement;
    expect(reportYearInput.value).toBe("");

    fireEvent.change(screen.getByDisplayValue("Sonstiges"), {
      target: { value: "Nebenkostenabrechnung" },
    });

    expect(reportYearInput.value).toBe(String(new Date().getFullYear()));
  });

  it("updates document metadata and relation assignment from the edit form", async () => {
    updateDocumentMetadataMock.mockResolvedValueOnce({
      ok: true,
      data: {
        ...baseDocument,
        title: "Nebenkosten 2025",
        category: "Nebenkostenabrechnung",
        uploadedBy: "Clara Beispiel",
        rentUnitId: "ru-2",
        unitLabel: "WE 02",
        updatedAt: "2026-03-24T10:30:00.000Z",
      },
    });

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    fireEvent.change(screen.getByDisplayValue("Mietvertrag Weber"), {
      target: { value: "Nebenkosten 2025" },
    });
    fireEvent.change(screen.getByDisplayValue("Mietvertrag"), {
      target: { value: "Nebenkostenabrechnung" },
    });
    fireEvent.change(screen.getByDisplayValue("Max Mustermann"), {
      target: { value: "Clara Beispiel" },
    });
    fireEvent.change(screen.getByDisplayValue("WE 01"), {
      target: { value: "ru-2" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));

    await waitFor(() => {
      expect(updateDocumentMetadataMock).toHaveBeenCalledWith("doc-1", {
        title: "Nebenkosten 2025",
        category: "Nebenkostenabrechnung",
        uploadedBy: "Clara Beispiel",
        objectId: "obj-1",
        rentUnitId: "ru-2",
        reportYear: "2025",
      });
    });

    const updatedRow = screen.getByText("Nebenkosten 2025").closest("div.grid");
    expect(updatedRow).not.toBeNull();
    expect(within(updatedRow as HTMLElement).getByText(/Hochgeladen von Clara Beispiel/)).toBeInTheDocument();
    expect(within(updatedRow as HTMLElement).getByText("WE 02")).toBeInTheDocument();
  });

  it("resorts the visible list when a metadata update changes the report year order", async () => {
    updateDocumentMetadataMock.mockResolvedValueOnce({
      ok: true,
      data: {
        ...secondDocument,
        reportYear: 2026,
        updatedAt: "2026-03-24T10:30:00.000Z",
      },
    });

    render(<DocumentsModule initialDocuments={[baseDocument, secondDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Bearbeiten" })[1]);
    fireEvent.change(screen.getByDisplayValue("2024"), {
      target: { value: "2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));

    await waitFor(() => {
      expect(updateDocumentMetadataMock).toHaveBeenCalledWith("doc-2", {
        title: "Nebenkosten Einheit 02",
        category: "Nebenkostenabrechnung",
        uploadedBy: "Max Mustermann",
        objectId: "obj-1",
        rentUnitId: "ru-2",
        reportYear: "2026",
      });
    });

    const visibleTitles = screen
      .getAllByText(/Mietvertrag Weber|Nebenkosten Einheit 02/)
      .filter((node) => node.tagName === "P")
      .map((node) => node.textContent);

    expect(visibleTitles.slice(0, 2)).toEqual([
      "Nebenkosten Einheit 02",
      "Mietvertrag Weber",
    ]);
  });

  it("blocks metadata updates when a required report year is invalid", async () => {
    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    fireEvent.change(screen.getByDisplayValue("Mietvertrag"), {
      target: { value: "Jahresreport WEG" },
    });
    fireEvent.change(screen.getByDisplayValue("2025"), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));

    expect(await screen.findByText("Für Jahresreports und Nebenkostenabrechnungen bitte ein gültiges 4-stelliges Berichtsjahr angeben.")).toBeInTheDocument();
    expect(updateDocumentMetadataMock).not.toHaveBeenCalled();
  });

  it("prefills a missing report year in the edit form when switching to a required category", () => {
    const documentWithoutReportYear: ImmoDocument = {
      ...baseDocument,
      id: "doc-7",
      title: "Allgemeines Schreiben",
      category: "Sonstiges",
      reportYear: null,
    };

    render(<DocumentsModule initialDocuments={[documentWithoutReportYear]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    const reportYearInput = screen.getByPlaceholderText("z. B. 2025") as HTMLInputElement;
    expect(reportYearInput.value).toBe("");

    fireEvent.change(screen.getByDisplayValue("Sonstiges"), {
      target: { value: "Nebenkostenabrechnung" },
    });

    expect(reportYearInput.value).toBe(String(new Date().getFullYear()));
  });

  it("removes a document from the visible list when a status change no longer matches the active filter", async () => {
    updateDocumentStatusMock.mockResolvedValueOnce({
      ok: true,
      data: {
        ...baseDocument,
        status: "Fehlt",
        updatedAt: "2026-03-24T10:30:00.000Z",
      },
    });
    getDocumentsMock.mockResolvedValueOnce([baseDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(screen.getByDisplayValue("Alle Status"), {
      target: { value: "Vorhanden" },
    });

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenCalledWith({
        objectId: undefined,
        rentUnitId: undefined,
        category: undefined,
        status: "Vorhanden",
        reportYear: undefined,
        search: undefined,
      });
    });

    const documentRow = screen.getByText("Mietvertrag Weber").closest("div.grid");
    expect(documentRow).not.toBeNull();

    fireEvent.change(within(documentRow as HTMLElement).getByDisplayValue("Vorhanden"), {
      target: { value: "Fehlt" },
    });

    await waitFor(() => {
      expect(updateDocumentStatusMock).toHaveBeenCalledWith("doc-1", "Fehlt");
    });

    expect(screen.queryByText("Mietvertrag Weber")).not.toBeInTheDocument();
    expect(screen.getByText("Keine Dokumente passen zur aktuellen Suche oder Filterkombination.")).toBeInTheDocument();
  });

  it("removes a document from the visible list when edited metadata no longer matches the active filter", async () => {
    updateDocumentMetadataMock.mockResolvedValueOnce({
      ok: true,
      data: {
        ...baseDocument,
        category: "Rechnung",
        updatedAt: "2026-03-24T10:30:00.000Z",
      },
    });
    getDocumentsMock.mockResolvedValueOnce([baseDocument]);

    render(<DocumentsModule initialDocuments={[baseDocument]} objects={objects} rentUnits={rentUnits} />);

    fireEvent.change(screen.getByDisplayValue("Alle Kategorien"), {
      target: { value: "Mietvertrag" },
    });

    await waitFor(() => {
      expect(getDocumentsMock).toHaveBeenCalledWith({
        objectId: undefined,
        rentUnitId: undefined,
        category: "Mietvertrag",
        status: undefined,
        reportYear: undefined,
        search: undefined,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    const editPanel = screen.getByText("Dokument bearbeiten").closest("div.rounded-2xl");
    expect(editPanel).not.toBeNull();

    fireEvent.change(within(editPanel as HTMLElement).getByDisplayValue("Mietvertrag"), {
      target: { value: "Rechnung" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));

    await waitFor(() => {
      expect(updateDocumentMetadataMock).toHaveBeenCalledWith("doc-1", {
        title: "Mietvertrag Weber",
        category: "Rechnung",
        uploadedBy: "Max Mustermann",
        objectId: "obj-1",
        rentUnitId: "ru-1",
        reportYear: "2025",
      });
    });

    expect(screen.queryByText("Mietvertrag Weber")).not.toBeInTheDocument();
    expect(screen.getByText("Keine Dokumente passen zur aktuellen Suche oder Filterkombination.")).toBeInTheDocument();
  });
});
