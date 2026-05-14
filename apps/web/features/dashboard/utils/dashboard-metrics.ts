export type DashboardActivity = {
  text: string;
  date: string;
};

type ContractMetricInput = {
  endDate?: string | null;
  status?: string | null;
};

type DocumentMetricInput = {
  actionState?: string | null;
  openIssues?: string[];
  status?: string | null;
  fileAvailable?: boolean | null;
};

type ReadingCampaignMetricInput = {
  status?: string | null;
  recipients?: Array<{ status?: string | null; submittedAt?: string | null }>;
};

function hasDate<T extends { date?: string }>(entry: T): entry is T & { date: string } {
  return typeof entry.date === "string" && entry.date.length > 0;
}

function toTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function buildRecentActivities(
  objects: Array<{ name: string; createdAt?: string }>,
  documents: Array<{ title: string; createdAt?: string }>,
  rentUnits: Array<{ unitLabel: string; createdAt?: string }>,
  campaigns: Array<{ object?: { name: string }; reportYear: number; createdAt?: string }> = [],
): DashboardActivity[] {
  return [
    ...objects.slice(0, 2).map((object) => ({
      text: `WEG angelegt: ${object.name}`,
      date: object.createdAt,
    })),
    ...documents.slice(0, 2).map((document) => ({
      text: `Dokument hochgeladen: ${document.title}`,
      date: document.createdAt,
    })),
    ...rentUnits.slice(0, 2).map((unit) => ({
      text: `Mieteinheit angelegt: ${unit.unitLabel}`,
      date: unit.createdAt,
    })),
    ...campaigns.slice(0, 2).map((campaign) => ({
      text: `Ablesekampagne angelegt: ${campaign.object?.name ?? "Objekt"} ${campaign.reportYear}`,
      date: campaign.createdAt,
    })),
  ]
    .filter(hasDate)
    .sort((left, right) => toTimestamp(right.date) - toTimestamp(left.date))
    .slice(0, 5);
}

export function countRecentDocuments(
  documents: Array<{ createdAt: string }>,
  now = Date.now(),
) {
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  return documents.filter((document) => toTimestamp(document.createdAt) > sevenDaysAgo).length;
}

export function countExpiringContracts(
  contracts: ContractMetricInput[],
  now = Date.now(),
) {
  const ninetyDaysFromNow = now + 90 * 24 * 60 * 60 * 1000;

  return contracts.filter((contract) => {
    if (contract.status === "Läuft aus" || contract.status === "In Prüfung") {
      return true;
    }

    const endDate = toTimestamp(contract.endDate);
    return endDate > now && endDate <= ninetyDaysFromNow;
  }).length;
}

export function countOpenDocumentCases(documents: DocumentMetricInput[]) {
  return documents.filter((document) => {
    if (document.actionState) {
      return true;
    }

    if (document.fileAvailable === false) {
      return true;
    }

    if ((document.openIssues ?? []).length > 0) {
      return true;
    }

    return document.status === "Fehlt" || document.status === "In Prüfung";
  }).length;
}

export function countOpenReadingCampaigns(campaigns: ReadingCampaignMetricInput[]) {
  return campaigns.filter((campaign) => {
    if (campaign.status === "offen") {
      return true;
    }

    const recipients = campaign.recipients ?? [];
    return recipients.some(
      (recipient) => recipient.status !== "eingereicht" && !recipient.submittedAt,
    );
  }).length;
}
