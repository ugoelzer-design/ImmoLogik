export type ReadingCampaignRecipient = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  rentUnitId: string;
  unitLabel: string;
  token: string;
  status: string;
  sentAt: string;
  submittedAt: string | null;
  expiresAt: string | null;
};

export type ReadingCampaign = {
  id: string;
  objectId: string;
  reportYear: number;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  object: {
    id: string;
    displayId: string;
    name: string;
  };
  recipients: ReadingCampaignRecipient[];
};

export type MeterDefinitionReading = {
  id: string;
  date: string;
  value: number;
  reader: string | null;
};

export type MeterDefinition = {
  id: string;
  objectId: string;
  rentUnitId: string | null;
  unitLabel: string | null;
  scope: string;
  type: string;
  label: string;
  meterNumber: string | null;
  unit: string;
  readings: MeterDefinitionReading[];
};

export type MeterAccessMeter = {
  id: string;
  type: string;
  label: string;
  unit: string;
  meterNumber: string | null;
  lastSubmittedValue: number | null;
  lastSubmittedDate: string | null;
};

export type MeterAccess = {
  token: string;
  status: string;
  reportYear: number;
  expiresAt: string | null;
  object: {
    id: string;
    displayId: string;
    name: string;
  };
  tenant: {
    id: string;
    fullName: string;
    email: string;
  };
  rentUnit: {
    id: string;
    unitLabel: string;
  };
  meters: MeterAccessMeter[];
};

export type CreateReadingCampaignInput = {
  objectId: string;
  reportYear: number;
  expiresAt?: string;
};

export type SubmitMeterReadingInput = {
  readerName?: string;
  readings: Array<{
    meterId: string;
    value: number;
    date?: string;
  }>;
};
