import { mockObjects } from "@/features/objects/data/mock-objects";
import { apiClient } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { ImmoObject } from "@/types/object";

export type CreateObjectInput = {
  name: string;
  address: string;
};

function buildMockObject(input: CreateObjectInput): ImmoObject {
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    address: input.address.trim(),
    type: "Wohnobjekt",
    status: "Neu",
    units: 1,
    occupancy: "0%",
    monthlyTargetRent: "0 €",
    note: "Neu angelegtes Objekt. Weitere Daten folgen im nächsten Schritt.",
  };
}

export async function getObjects(): Promise<ImmoObject[]> {
  try {
    return await apiClient.get<ImmoObject[]>(apiEndpoints.objects.list);
  } catch {
    return mockObjects;
  }
}

export async function createObject(
  input: CreateObjectInput
): Promise<ImmoObject> {
  try {
    return await apiClient.post<ImmoObject, CreateObjectInput>(
      apiEndpoints.objects.list,
      input
    );
  } catch {
    return buildMockObject(input);
  }
}
