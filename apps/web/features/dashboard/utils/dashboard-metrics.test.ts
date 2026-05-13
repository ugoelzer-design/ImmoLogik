import { describe, expect, it } from "vitest";
import { buildRecentActivities, countRecentDocuments } from "./dashboard-metrics";

describe("dashboard-metrics", () => {
  it("sorts recent activities by date and limits the result", () => {
    const result = buildRecentActivities(
      [
        { name: "Objekt A", createdAt: "2026-03-20T10:00:00.000Z" },
        { name: "Objekt B", createdAt: "2026-03-18T10:00:00.000Z" },
      ],
      [
        { title: "Dok A", createdAt: "2026-03-22T09:00:00.000Z" },
        { title: "Dok B", createdAt: "2026-03-19T09:00:00.000Z" },
      ],
      [
        { unitLabel: "WE 01", createdAt: "2026-03-21T09:00:00.000Z" },
        { unitLabel: "WE 02", createdAt: "2026-03-17T09:00:00.000Z" },
      ],
    );

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({
      text: "Dokument hochgeladen: Dok A",
      date: "2026-03-22T09:00:00.000Z",
    });
    expect(result.at(-1)?.text).toBe("WEG angelegt: Objekt B");
  });

  it("counts only documents from the last seven days", () => {
    const now = new Date("2026-03-22T12:00:00.000Z").getTime();
    const result = countRecentDocuments(
      [
        { createdAt: "2026-03-22T11:00:00.000Z" },
        { createdAt: "2026-03-18T11:00:00.000Z" },
        { createdAt: "2026-03-10T11:00:00.000Z" },
        { createdAt: "ungueltig" },
      ],
      now,
    );

    expect(result).toBe(2);
  });
});
