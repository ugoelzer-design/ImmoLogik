import { apiClient } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { Contract, ContractInput } from "@/types/contract";

export async function getContracts(): Promise<Contract[]> {
  try {
    return await apiClient.get<Contract[]>(apiEndpoints.contracts.list);
  } catch {
    return [];
  }
}

export async function createContract(input: ContractInput): Promise<Contract> {
  return apiClient.post<Contract, ContractInput>(apiEndpoints.contracts.list, input);
}

export async function updateContract(id: string, input: Partial<ContractInput>): Promise<Contract> {
  return apiClient.patch<Contract, Partial<ContractInput>>(apiEndpoints.contracts.detail(id), input);
}

export async function deleteContract(id: string): Promise<void> {
  await apiClient.del<void>(apiEndpoints.contracts.detail(id));
}
