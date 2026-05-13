import { apiClient } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { Tenant, TenantInput } from "@/types/tenant";

export async function getTenants(): Promise<Tenant[]> {
  try {
    return await apiClient.get<Tenant[]>(apiEndpoints.tenants.list);
  } catch {
    return [];
  }
}

export async function createTenant(input: TenantInput): Promise<Tenant> {
  return apiClient.post<Tenant, TenantInput>(apiEndpoints.tenants.list, input);
}

export async function updateTenant(id: string, input: Partial<TenantInput>): Promise<Tenant> {
  return apiClient.patch<Tenant, Partial<TenantInput>>(apiEndpoints.tenants.detail(id), input);
}

export async function deleteTenant(id: string): Promise<void> {
  await apiClient.del<void>(apiEndpoints.tenants.detail(id));
}
