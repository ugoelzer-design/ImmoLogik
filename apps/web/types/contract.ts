export type ContractStatus = "Aktiv" | "Läuft aus" | "In Prüfung";

export type Contract = {
  id: string;
  title: string;
  objectName: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
};
