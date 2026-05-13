import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = {
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
  patch: vi.fn(),
};

vi.mock("@/lib/api/client", () => ({
  API_BASE_URL: "http://api.test",
  apiClient: apiClientMock,
}));

describe("documents.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("loads documents via the shared api client", async () => {
    const documents = [{ id: "doc-1", title: "Beleg" }];
    apiClientMock.get.mockResolvedValueOnce(documents);

    const { getDocuments } = await import("./documents.service");
    await expect(getDocuments({
      objectId: "obj-1",
      rentUnitId: "ru-3",
      category: "Mietvertrag",
      status: "In Prüfung",
      fileState: "missing",
      reportYear: "2025",
      search: "WEG-001",
    })).resolves.toEqual(documents);
    expect(apiClientMock.get).toHaveBeenCalledWith("/documents", {
      query: {
        objectId: "obj-1",
        rentUnitId: "ru-3",
        category: "Mietvertrag",
        status: "In Prüfung",
        fileState: "missing",
        reportYear: "2025",
        search: "WEG-001",
      },
    });
  });

  it("surfaces document list loading errors to the caller", async () => {
    apiClientMock.get.mockRejectedValueOnce(new Error("network"));

    const { getDocuments } = await import("./documents.service");

    await expect(getDocuments({ category: "Mietvertrag" })).rejects.toThrow("network");
  });

  it("loads a single document and its download url via centralized endpoints", async () => {
    apiClientMock.get
      .mockResolvedValueOnce({ id: "doc-7", title: "Bericht" })
      .mockResolvedValueOnce({ url: "https://download.test/doc-7" });

    const { getDocument, getDownloadUrl } = await import("./documents.service");

    await expect(getDocument("doc-7")).resolves.toEqual({ id: "doc-7", title: "Bericht" });
    await expect(getDownloadUrl("doc-7")).resolves.toEqual({ ok: true, data: "https://download.test/doc-7" });

    expect(apiClientMock.get).toHaveBeenNthCalledWith(1, "/documents/doc-7");
    expect(apiClientMock.get).toHaveBeenNthCalledWith(2, "/documents/doc-7/download");
  });

  it("loads the document storage status via the documents endpoint", async () => {
    apiClientMock.get.mockResolvedValueOnce({
      mode: "filesystem",
      rootPath: "C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente",
      available: true,
    });

    const { getDocumentStorageStatus } = await import("./documents.service");

    await expect(getDocumentStorageStatus()).resolves.toEqual({
      mode: "filesystem",
      rootPath: "C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente",
      available: true,
    });
    expect(apiClientMock.get).toHaveBeenCalledWith("/documents/storage/status");
  });

  it("exports the document inventory as csv via the central API base url", async () => {
    const blob = new Blob(["id;title"], { type: "text/csv;charset=utf-8" });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      blob: async () => blob,
    } as Response);

    const { exportDocumentsInventory } = await import("./documents.service");

    await expect(exportDocumentsInventory()).resolves.toEqual({ ok: true, data: blob });
    expect(fetch).toHaveBeenCalledWith("http://api.test/documents/inventory/export", {
      method: "GET",
    });
  });

  it("uploads documents against the central API base url", async () => {
    const formData = new FormData();
    const uploadResponse = { id: "doc-2", title: "Upload" };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => uploadResponse,
    } as Response);

    const { uploadDocument } = await import("./documents.service");
    await expect(uploadDocument(formData)).resolves.toEqual({ ok: true, document: uploadResponse });
    expect(fetch).toHaveBeenCalledWith("http://api.test/documents/upload", {
      method: "POST",
      body: formData,
    });
  });

  it("attaches a physical file to an existing document via the central API base url", async () => {
    const formData = new FormData();
    const uploadResponse = { id: "doc-2", title: "Upload", status: "Vorhanden" };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => uploadResponse,
    } as Response);

    const { attachFileToDocument } = await import("./documents.service");
    await expect(attachFileToDocument("doc-2", formData)).resolves.toEqual({ ok: true, document: uploadResponse });
    expect(fetch).toHaveBeenCalledWith("http://api.test/documents/doc-2/file", {
      method: "POST",
      body: formData,
    });
  });

  it("surfaces backend upload errors with their message", async () => {
    const formData = new FormData();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Dokumentenablage nicht verfügbar: C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente" }),
    } as Response);

    const { uploadDocument } = await import("./documents.service");

    await expect(uploadDocument(formData)).resolves.toEqual({
      ok: false,
      error: "Dokumentenablage nicht verfügbar: C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente",
    });
  });

  it("surfaces backend messages when attaching a file to an existing document fails", async () => {
    const formData = new FormData();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Datei konnte nicht zum Dokument ergänzt werden." }),
    } as Response);

    const { attachFileToDocument } = await import("./documents.service");

    await expect(attachFileToDocument("doc-7", formData)).resolves.toEqual({
      ok: false,
      error: "Datei konnte nicht zum Dokument ergänzt werden.",
    });
  });

  it("surfaces backend messages when the inventory export fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Dokumentenbestand konnte nicht exportiert werden." }),
    } as Response);

    const { exportDocumentsInventory } = await import("./documents.service");

    await expect(exportDocumentsInventory()).resolves.toEqual({
      ok: false,
      error: "Dokumentenbestand konnte nicht exportiert werden.",
    });
  });

  it("creates, updates and deletes documents via centralized endpoints", async () => {
    apiClientMock.post.mockResolvedValueOnce({ id: "doc-7", status: "Fehlt", title: "Abrechnung 2025" });
    apiClientMock.patch.mockResolvedValueOnce({ id: "doc-8", status: "In Prüfung" });
    apiClientMock.patch.mockResolvedValueOnce({ id: "doc-8", title: "Nebenkosten 2025" });
    apiClientMock.del.mockResolvedValueOnce(undefined);

    const { createMissingDocument, updateDocumentStatus, updateDocumentMetadata, deleteDocument } = await import("./documents.service");

    await expect(createMissingDocument({
      title: "Abrechnung 2025",
      category: "Nebenkostenabrechnung",
      objectId: "obj-1",
      rentUnitId: "ru-2",
      reportYear: "2025",
    })).resolves.toEqual({ ok: true, document: { id: "doc-7", status: "Fehlt", title: "Abrechnung 2025" } });
    await expect(updateDocumentStatus("doc-8", "In Prüfung")).resolves.toEqual({ ok: true, data: { id: "doc-8", status: "In Prüfung" } });
    await expect(
      updateDocumentMetadata("doc-8", {
        title: "Nebenkosten 2025",
        category: "Nebenkostenabrechnung",
        objectId: "obj-1",
        rentUnitId: "ru-2",
        reportYear: "2025",
      }),
    ).resolves.toEqual({ ok: true, data: { id: "doc-8", title: "Nebenkosten 2025" } });
    await expect(deleteDocument("doc-8")).resolves.toEqual({ ok: true, data: true });

    expect(apiClientMock.post).toHaveBeenCalledWith("/documents/missing", {
      title: "Abrechnung 2025",
      category: "Nebenkostenabrechnung",
      objectId: "obj-1",
      rentUnitId: "ru-2",
      reportYear: "2025",
    });
    expect(apiClientMock.patch).toHaveBeenCalledWith("/documents/doc-8/status", { status: "In Prüfung" });
    expect(apiClientMock.patch).toHaveBeenCalledWith("/documents/doc-8", {
      title: "Nebenkosten 2025",
      category: "Nebenkostenabrechnung",
      objectId: "obj-1",
      rentUnitId: "ru-2",
      reportYear: "2025",
    });
    expect(apiClientMock.del).toHaveBeenCalledWith("/documents/doc-8");
  });

  it("surfaces backend messages for document actions", async () => {
    apiClientMock.post.mockRejectedValueOnce(new Error("{\"message\":\"Fehlendes Dokument konnte nicht angelegt werden.\"}"));
    apiClientMock.get.mockRejectedValueOnce(new Error("{\"message\":\"Datei nicht gefunden.\"}"));
    apiClientMock.patch.mockRejectedValueOnce(new Error("{\"message\":\"Ungültiger Dokumentstatus.\"}"));
    apiClientMock.patch.mockRejectedValueOnce(new Error("{\"message\":\"OneDrive-Ablage nicht erreichbar.\"}"));
    apiClientMock.del.mockRejectedValueOnce(new Error("{\"message\":\"Dokument konnte physisch nicht gelöscht werden.\"}"));

    const { createMissingDocument, getDownloadUrl, updateDocumentStatus, updateDocumentMetadata, deleteDocument } = await import("./documents.service");

    await expect(createMissingDocument({ title: "Fehlt" })).resolves.toEqual({ ok: false, error: "Fehlendes Dokument konnte nicht angelegt werden." });
    await expect(getDownloadUrl("doc-1")).resolves.toEqual({ ok: false, error: "Datei nicht gefunden." });
    await expect(updateDocumentStatus("doc-1", "Fehlt")).resolves.toEqual({ ok: false, error: "Ungültiger Dokumentstatus." });
    await expect(updateDocumentMetadata("doc-1", { title: "Neu" })).resolves.toEqual({ ok: false, error: "OneDrive-Ablage nicht erreichbar." });
    await expect(deleteDocument("doc-1")).resolves.toEqual({ ok: false, error: "Dokument konnte physisch nicht gelöscht werden." });
  });
});
