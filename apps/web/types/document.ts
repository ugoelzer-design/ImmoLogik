export type ImmoDocument = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  objectId: string | null;
  objectName: string;
  category: string;
  status: string;
  uploadedBy: string | null;
  downloadUrl: string | null;
  createdAt: string;
  updatedAt: string;
};