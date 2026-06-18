import { apiClient } from "@/lib/api/client";

export type PortalMieter = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  objectDisplayId: string;
  objectName: string;
  objectAddress: string;
  unit: string;
  sollMiete: number;
  zahlungsStatus: string;
  faelligAm: string;
};

export type PortalVertrag = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
};

export type PortalDokument = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  category: string;
  status: string;
  createdAt: string;
};

export type PortalAblesung = {
  id: string;
  reportYear: number;
  status: string;
  expiresAt: string | null;
  meinZugang: {
    token: string;
    status: string;
    submittedAt: string | null;
    expiresAt: string | null;
  } | null;
};

export type PortalData = {
  portalAccess: { expiresAt: string };
  mieter: PortalMieter;
  vertraege: PortalVertrag[];
  dokumente: PortalDokument[];
  ablesungen: PortalAblesung[];
};

export async function getPortalData(token: string): Promise<PortalData> {
  return apiClient.get<PortalData>(`/mieter-portal/access/${token}`);
}

export function getDocumentFileUrl(token: string, documentId: string): string {
  const base =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? `${window.location.origin}/api/v1`)
      : (process.env.API_INTERNAL_URL ?? "http://api:4000/api/v1");
  return `${base}/mieter-portal/access/${token}/documents/${documentId}/file`;
}

export async function createPortalAccess(mieterId: string) {
  return apiClient.post<{ token: string; expiresAt: string; mieterName: string }>(
    `/mieter-portal/invite/${mieterId}`,
  );
}
