import { mockDocuments } from "@/features/documents/data/mock-documents";
import { apiClient } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { ImmoDocument } from "@/types/document";

export async function getDocuments(): Promise<ImmoDocument[]> {
  try {
    return await apiClient.get<ImmoDocument[]>(apiEndpoints.documents.list);
  } catch {
    return mockDocuments;
  }
}
