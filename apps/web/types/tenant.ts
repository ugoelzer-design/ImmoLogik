export type TenantStatus = "Aktiv" | "Ausstehend" | "Beendet";

export type Tenant = {
  id: string;
  objectId: string;
  rentUnitId: string;
  fullName: string;
  objectName: string;
  objectDisplayId: string;
  unit: string;
  email: string;
  phone: string;
  status: TenantStatus;
};

export type TenantInput = {
  objectId: string;
  rentUnitId: string;
  fullName: string;
  email: string;
  phone: string;
  status: TenantStatus;
};
