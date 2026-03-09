export type TenantStatus = "Aktiv" | "Ausstehend" | "Beendet";

export type Tenant = {
  id: string;
  fullName: string;
  objectName: string;
  unit: string;
  email: string;
  phone: string;
  status: TenantStatus;
};
