import type { ImmoDocument } from "@/types/document";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

export async function getDocuments(objectId?: string): Promise<ImmoDocument[]> {
  const url = objectId ? `${API}/documents?objectId=${objectId}` : `${API}/documents`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function getDocument(id: string): Promise<ImmoDocument | null> {
  const res = await fetch(`${API}/documents/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function getDownloadUrl(id: string): Promise<string | null> {
  const res = await fetch(`${API}/documents/${id}/download`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url;
}

export async function uploadDocument(formData: FormData): Promise<ImmoDocument | null> {
  const res = await fetch(`${API}/documents/upload`, { method: "POST", body: formData });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteDocument(id: string): Promise<boolean> {
  const res = await fetch(`${API}/documents/${id}`, { method: "DELETE" });
  return res.ok;
}

export async function updateDocumentStatus(id: string, status: string): Promise<boolean> {
  const res = await fetch(`${API}/documents/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.ok;
}