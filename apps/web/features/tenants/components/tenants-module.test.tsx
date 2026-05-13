import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantsModule } from "./tenants-module";
import type { ImmoDocument } from "@/types/document";
import type { ImmoObject } from "@/types/object";
import type { Tenant } from "@/types/tenant";

const { createTenantMock, deleteTenantMock, updateTenantMock } = vi.hoisted(() => ({
  createTenantMock: vi.fn(),
  deleteTenantMock: vi.fn(),
  updateTenantMock: vi.fn(),
}));

vi.mock("@/features/tenants/services/tenants.service", () => ({
  createTenant: createTenantMock,
  deleteTenant: deleteTenantMock,
  updateTenant: updateTenantMock,
}));

const objects: ImmoObject[] = [
  {
    id: "obj-1",
    displayId: "WEG-001",
    name: "Sonnenhof",
    address: "Musterstr. 1",
    type: "WEG",
    status: "Aktiv",
    units: 4,
    occupancy: "100%",
    monthlyTargetRent: "4.000 €",
    note: "",
  },
];

const rentUnits = [
  {
    id: "unit-1",
    objectId: "obj-1",
    unitLabel: "WE 01",
    tenant: "Anna Becker",
    sollMiete: 1000,
    istMiete: 1000,
    zahlungsStatus: "Bezahlt",
    faelligAm: "2026-04-01",
  },
];

const tenants: Tenant[] = [
  {
    id: "tenant-1",
    objectId: "obj-1",
    rentUnitId: "unit-1",
    fullName: "Anna Becker",
    objectName: "Sonnenhof",
    objectDisplayId: "WEG-001",
    unit: "WE 01",
    email: "anna@example.test",
    phone: "0123456789",
    status: "Aktiv",
  },
];

const documents: ImmoDocument[] = [
  {
    id: "doc-1",
    title: "Mietvertrag Anna Becker",
    fileName: "mietvertrag.pdf",
    mimeType: "application/pdf",
    size: 1024,
    objectId: "obj-1",
    objectName: "WEG-001 · Sonnenhof",
    rentUnitId: "unit-1",
    unitLabel: "WE 01",
    reportYear: 2026,
    category: "Mietvertrag",
    status: "In Prüfung",
    uploadedBy: "Clara",
    downloadUrl: null,
    storagePath: null,
    fileAvailable: true,
    openIssues: ["Dokument wartet auf Prüfung"],
    actionState: "review_pending",
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-01T10:00:00.000Z",
  },
];

describe("TenantsModule", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("shows object display id and unit in the tenant list", () => {
    render(<TenantsModule tenants={tenants} objects={objects} rentUnits={rentUnits} documents={documents} />);

    expect(screen.getByText("WEG-001 · Sonnenhof · WE 01")).toBeInTheDocument();
  });

  it("shows object display id and unit in the form after selecting object and unit", async () => {
    render(<TenantsModule tenants={tenants} objects={objects} rentUnits={rentUnits} documents={documents} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Mieter anlegen" }));
    fireEvent.change(screen.getByDisplayValue("Objekt auswählen"), {
      target: { value: "obj-1" },
    });
    fireEvent.change(screen.getByDisplayValue("Einheit auswählen"), {
      target: { value: "unit-1" },
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("WEG-001 · WE 01")).toBeInTheDocument();
    });
  });

  it("shows related document counts and a link into the document context", () => {
    render(<TenantsModule tenants={tenants} objects={objects} rentUnits={rentUnits} documents={documents} />);

    expect(screen.getByText("1 Dokumente · 1 offene Dokumentfälle")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dokumente" })).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1&rentUnitId=unit-1",
    );
  });
});
