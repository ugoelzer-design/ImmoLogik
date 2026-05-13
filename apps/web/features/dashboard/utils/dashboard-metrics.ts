export type DashboardActivity = {
  text: string;
  date: string;
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
