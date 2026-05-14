import { describe, expect, it } from "vitest";
import {
  buildDocumentRequirements,
  getMissingDocumentRequirements,
} from "./document-requirements";
import type { Contract } from "@/types/contract";
import type { ImmoDocument } from "@/types/document";
import type { ImmoObject } from "@/types/object";
import type { Tenant } from "@/types/tenant";

const object: ImmoObject = {
  id: "obj-1",
  displayId: "WEG-001",
  name: "Sonnenhof",
  address: "Musterstraße 1, Berlin",
  type: "WEG",
  status: "Aktiv",
  units: 2,
  occupancy: "2/2",
  monthlyTargetRent: "2.000 EUR",
  note: "",
};

const tenant: Tenant = {
  id: "tenant-1",
  objectId: "obj-1",
  rentUnitId: "unit-1",
  fullName: "Max Muster",
  objectName: "Sonnenhof",
  objectDisplayId: "WEG-001",
  unit: "WE 01",
  email: "max@example.test",
  phone: "",
  status: "Aktiv",
};

const contract: Contract = {
  id: "contract-1",
  objectId: "obj-1",
  tenantId: "tenant-1",
  rentUnitId: "unit-1",
  title: "Mietvertrag WE 01",
  objectName: "Sonnenhof",
  objectDisplayId: "WEG-001",
  tenantName: "Max Muster",
  unit: "WE 01",
  startDate: "2025-01-01",
  endDate: "2026-12-31",
  status: "Aktiv",
};

function documentFor(
  category: string,
  options: Partial<ImmoDocument> = {},
): ImmoDocument {
  return {
    id: `${category}-${options.rentUnitId ?? "object"}`,
    title: category,
    fileName: `${category}.pdf`,
    mimeType: "application/pdf",
    size: 100,
    objectId: "obj-1",
    objectName: "WEG-001 · Sonnenhof",
    rentUnitId: null,
    unitLabel: null,
    reportYear: null,
    category,
    status: "Vorhanden",
    uploadedBy: null,
    downloadUrl: null,
    fileAvailable: true,
    openIssues: [],
    actionState: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...options,
  };
}

describe("document-requirements", () => {
  it("creates object and unit requirements for the previous report year", () => {
    const requirements = buildDocumentRequirements({
      object,
      documents: [],
      tenants: [tenant],
      contracts: [contract],
      today: new Date("2026-05-14T10:00:00.000Z"),
    });

    expect(requirements.map((requirement) => requirement.title)).toEqual([
      "Jahresreport WEG 2025",
      "Mietvertrag WE 01",
      "Nebenkostenabrechnung WE 01 2025",
      "Jahresreport Wohnung WE 01 2025",
    ]);
    expect(getMissingDocumentRequirements(requirements)).toHaveLength(4);
  });

  it("marks matching usable documents as fulfilled", () => {
    const requirements = buildDocumentRequirements({
      object,
      documents: [
        documentFor("Jahresreport WEG", { reportYear: 2025 }),
        documentFor("Mietvertrag", { rentUnitId: "unit-1", unitLabel: "WE 01" }),
        documentFor("Nebenkostenabrechnung", {
          rentUnitId: "unit-1",
          unitLabel: "WE 01",
          reportYear: 2025,
        }),
        documentFor("Jahresreport Wohnung", {
          rentUnitId: "unit-1",
          unitLabel: "WE 01",
          reportYear: 2025,
        }),
      ],
      tenants: [tenant],
      contracts: [contract],
      today: new Date("2026-05-14T10:00:00.000Z"),
    });

    expect(getMissingDocumentRequirements(requirements)).toHaveLength(0);
  });

  it("tracks a requirement with a missing placeholder without marking it fulfilled", () => {
    const requirements = buildDocumentRequirements({
      object,
      documents: [
        documentFor("Jahresreport WEG", {
          reportYear: 2025,
          status: "Fehlt",
          fileAvailable: false,
        }),
      ],
      tenants: [],
      contracts: [],
      today: new Date("2026-05-14T10:00:00.000Z"),
    });

    expect(requirements[0]).toMatchObject({
      tracked: true,
      fulfilled: false,
    });
    expect(getMissingDocumentRequirements(requirements)).toHaveLength(0);
  });
});
