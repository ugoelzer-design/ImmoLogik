export type ImmoObjectStatus = "Aktiv" | "In Prüfung" | "Neu";

export type ImmoObject = {
  id: string;
  name: string;
  address: string;
  type: string;
  status: ImmoObjectStatus;
  units: number;
  occupancy: string;
  monthlyTargetRent: string;
  note: string;
};