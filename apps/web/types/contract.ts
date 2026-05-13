export type ContractStatus = "Aktiv" | "Läuft aus" | "In Prüfung";

export type Contract = {
  id: string;
  objectId: string;
  tenantId: string;
  rentUnitId: string | null;
  title: string;
  objectName: string;
  objectDisplayId: string;
  tenantName: string;
  unit: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
};

export type ContractInput = {
  objectId: string;
  tenantId: string;
  rentUnitId?: string | null;
  title: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
};
