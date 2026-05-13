import { apiClient } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";

export type RentUnit = {
  id: string;
  objectId: string;
  unitLabel: string;
  tenant: string;
  sollMiete: number;
  istMiete: number;
  zahlungsStatus: string;
  faelligAm: string;
};

export type CreateRentUnitInput = {
  objectId: string;
  unitLabel: string;
  tenant: string;
  sollMiete: number;
  istMiete?: number;
  zahlungsStatus?: string;
  faelligAm: string;
};

export async function getRentUnits(): Promise<RentUnit[]> {
  try {
    return await apiClient.get<RentUnit[]>(apiEndpoints.rentUnits.list);
  } catch {
    return [];
  }
}

export async function createRentUnit(input: CreateRentUnitInput): Promise<RentUnit> {
  return apiClient.post<RentUnit, CreateRentUnitInput>(apiEndpoints.rentUnits.list, input);
}

export async function deleteRentUnit(id: string): Promise<void> {
  await apiClient.del<void>(apiEndpoints.rentUnits.detail(id));
}
