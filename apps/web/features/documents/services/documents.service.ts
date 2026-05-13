import type { ImmoDocument } from "@/types/document";
import { API_BASE_URL, apiClient } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";

type GetDocumentsFilters = {
  objectId?: string;
  rentUnitId?: string;
  category?: string;
  status?: string;
  reportYear?: string;
  search?: string;
  fileState?: string;
  actionState?: string;
};

type DocumentStorageStatus = {
  mode: "filesystem" | "s3";
  rootPath: string | null;
  available: boolean;
};

type UploadDocumentResult =
  | { ok: true; document: ImmoDocument }
  | { ok: false; error: string };

type CreateMissingDocumentInput = {
  objectId?: string;
  rentUnitId?: string;
  reportYear?: string;
  category?: string;
  title: string;
  uploadedBy?: string;
};

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) {
        return parsed.message[0] || fallback;
      }

      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      return error.message || fallback;
    }
  }

  return fallback;
}

export async function getDocuments(filters?: GetDocumentsFilters): Promise<ImmoDocument[]> {
  return apiClient.get<ImmoDocument[]>(apiEndpoints.documents.list, {
    query: filters && Object.values(filters).some(Boolean) ? filters : undefined,
  });
}

export async function getDocument(id: string): Promise<ImmoDocument | null> {
  try {
    return await apiClient.get<ImmoDocument>(apiEndpoints.documents.detail(id));
  } catch {
    return null;
  }
}

export async function getDownloadUrl(id: string): Promise<ActionResult<string>> {
  try {
    const data = await apiClient.get<{ url: string }>(apiEndpoints.documents.download(id));
    return { ok: true, data: data.url };
  } catch (error) {
    return {
      ok: false,
      error: extractErrorMessage(error, "Download-Link konnte nicht geladen werden."),
    };
  }
}

export async function getDocumentStorageStatus(): Promise<DocumentStorageStatus | null> {
  try {
    return await apiClient.get<DocumentStorageStatus>("/documents/storage/status");
  } catch {
    return null;
  }
}

export async function exportDocumentsInventory(): Promise<ActionResult<Blob>> {
  try {
    const res = await fetch(`${API_BASE_URL}${apiEndpoints.documents.inventoryExport}`, {
      method: "GET",
    });
    if (!res.ok) {
      const errorPayload = await res.json().catch(() => null) as { message?: string | string[] } | null;
      const message = Array.isArray(errorPayload?.message)
        ? errorPayload.message[0]
        : errorPayload?.message;

      return {
        ok: false,
        error: message || "Dokumentenbestand konnte nicht exportiert werden.",
      };
    }

    return {
      ok: true,
      data: await res.blob(),
    };
  } catch {
    return {
      ok: false,
      error: "Dokumentenbestand konnte nicht exportiert werden.",
    };
  }
}

export async function uploadDocument(formData: FormData): Promise<UploadDocumentResult> {
  try {
    const res = await fetch(`${API_BASE_URL}${apiEndpoints.documents.upload}`, { method: "POST", body: formData });
    if (!res.ok) {
      const errorPayload = await res.json().catch(() => null) as { message?: string | string[] } | null;
      const message = Array.isArray(errorPayload?.message)
        ? errorPayload.message[0]
        : errorPayload?.message;

      return {
        ok: false,
        error: message || "Upload fehlgeschlagen.",
      };
    }

    return {
      ok: true,
      document: await res.json(),
    };
  } catch {
    return {
      ok: false,
      error: "Upload fehlgeschlagen.",
    };
  }
}

export async function attachFileToDocument(
  id: string,
  formData: FormData,
): Promise<UploadDocumentResult> {
  try {
    const res = await fetch(`${API_BASE_URL}${apiEndpoints.documents.file(id)}`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const errorPayload = await res.json().catch(() => null) as { message?: string | string[] } | null;
      const message = Array.isArray(errorPayload?.message)
        ? errorPayload.message[0]
        : errorPayload?.message;

      return {
        ok: false,
        error: message || "Datei konnte nicht zum Dokument ergänzt werden.",
      };
    }

    return {
      ok: true,
      document: await res.json(),
    };
  } catch {
    return {
      ok: false,
      error: "Datei konnte nicht zum Dokument ergänzt werden.",
    };
  }
}

export async function createMissingDocument(
  payload: CreateMissingDocumentInput,
): Promise<UploadDocumentResult> {
  try {
    return {
      ok: true,
      document: await apiClient.post<ImmoDocument, CreateMissingDocumentInput>(
        "/documents/missing",
        payload,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error: extractErrorMessage(error, "Fehlendes Dokument konnte nicht angelegt werden."),
    };
  }
}

export async function deleteDocument(id: string): Promise<ActionResult<true>> {
  try {
    await apiClient.del<void>(apiEndpoints.documents.detail(id));
    return { ok: true, data: true };
  } catch (error) {
    return {
      ok: false,
      error: extractErrorMessage(error, "Dokument konnte nicht gelöscht werden."),
    };
  }
}

export async function updateDocumentStatus(id: string, status: string): Promise<ActionResult<ImmoDocument>> {
  try {
    return {
      ok: true,
      data: await apiClient.patch<ImmoDocument>(apiEndpoints.documents.status(id), { status }),
    };
  } catch (error) {
    return {
      ok: false,
      error: extractErrorMessage(error, "Status konnte nicht aktualisiert werden."),
    };
  }
}

type UpdateDocumentMetadataInput = {
  objectId?: string;
  rentUnitId?: string;
  reportYear?: string;
  category?: string;
  title?: string;
  uploadedBy?: string;
};

export async function updateDocumentMetadata(
  id: string,
  payload: UpdateDocumentMetadataInput,
): Promise<ActionResult<ImmoDocument>> {
  try {
    return {
      ok: true,
      data: await apiClient.patch<ImmoDocument>(apiEndpoints.documents.detail(id), payload),
    };
  } catch (error) {
    return {
      ok: false,
      error: extractErrorMessage(error, "Dokumentdaten konnten nicht aktualisiert werden."),
    };
  }
}
