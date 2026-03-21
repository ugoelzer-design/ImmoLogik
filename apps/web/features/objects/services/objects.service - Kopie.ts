import { apiClient } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { ImmoObject } from "@/types/object";

export type CreateObjectInput = {
  name: string;
  address: string;
  units: number;
};

function normalizeDisplayId(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeObject(object: ImmoObject): ImmoObject {
  return {
    ...object,
    displayId:
      typeof object.displayId === "string" ? normalizeDisplayId(object.displayId) : "",
  };
}

function sortObjectsByDisplayId(objects: ImmoObject[]): ImmoObject[] {
  return [...objects].sort((a, b) => a.displayId.localeCompare(b.displayId));
}

export async function getObjects(): Promise<ImmoObject[]> {
  const objects = await apiClient.get<ImmoObject[]>(apiEndpoints.objects.list);
  return sortObjectsByDisplayId(objects.map(normalizeObject));
}

export async function createObject(
  input: CreateObjectInput,
): Promise<ImmoObject> {
  const object = await apiClient.post<ImmoObject, CreateObjectInput>(
    apiEndpoints.objects.list,
    input,
  );

  return normalizeObject(object);
}

export async function deleteObject(id: string): Promise<void> {
  await apiClient.del<void>(apiEndpoints.objects.detail(id));
}
