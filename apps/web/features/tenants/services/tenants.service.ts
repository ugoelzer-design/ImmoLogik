import { mockTenants } from "@/features/tenants/data/mock-tenants";
import { apiClient } from "@/lib/api/client";
import { apiEndpoints } from "@/lib/api/endpoints";
import type { Tenant } from "@/types/tenant";

export async function getTenants(): Promise<Tenant[]> {
  try {
    return await apiClient.get<Tenant[]>(apiEndpoints.tenants.list);
  } catch {
    return mockTenants;
  }
}
