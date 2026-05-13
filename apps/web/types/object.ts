export type ImmoObjectStatus = "Aktiv" | "In Prüfung" | "Neu";

export type ImmoObject = {
  id: string;
  displayId: string;
  name: string;
  address: string;
  type: string;
  status: ImmoObjectStatus;
  units: number;
  occupancy: string;
  monthlyTargetRent: string;
  note: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ObjectUnitStatus = "frei" | "vermietet" | "reserviert" | "inaktiv";

export type ObjectUnit = {
  id: string;
  objectId: string;
  unitLabel: string;
  designation: string;
  area: string;
  status: ObjectUnitStatus;
  mea?: string;
  usageType?: string;
  ownerName?: string;
  monthlyPrepayment?: string;
};

export type ObjectTenancy = {
  id: string;
  objectId: string;
  unitId: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  persons: string;
};

export type ObjectMeterReading = {
  id: string;
  date: string;
  value: string;
  reader: string;
};

export type ObjectMeterScope = "object" | "apartment";

export type ObjectMeterOrigin = "standard" | "custom";

export type ObjectMeter = {
  id: string;
  objectId: string;
  origin: ObjectMeterOrigin;
  standardKey: string | null;
  scope: ObjectMeterScope;
  apartmentId: string | null;
  type: string;
  label: string;
  meterNumber: string;
  unit: string;
  readings: ObjectMeterReading[];
};

export type ObjectUtility = {
  id: string;
  objectId: string;
  label: string;
  category: string;
  apartmentIds: string[];
  meterIds: string[];
  note: string;
};

export type AbrechnungseinheitBasis = {
  objectId: string;
  objectDisplayId: string;
  objectName: string;
  unitId: string;
  unitLabel: string;
  designation: string;
  area: string;
  mea?: string;
  ownerName?: string;
  tenantName?: string;
  persons?: string;
  monthlyPrepayment?: string;
};
