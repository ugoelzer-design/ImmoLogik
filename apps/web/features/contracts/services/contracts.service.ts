import { mockContracts } from "@/features/contracts/data/mock-contracts";
import { apiClient } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { Contract } from "@/types/contract";

export async function getContracts(): Promise<Contract[]> {
  try {
    return await apiClient.get<Contract[]>(apiEndpoints.contracts.list);
  } catch {
    return mockContracts;
  }
}
