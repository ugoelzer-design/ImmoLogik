import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContractsModule } from "./contracts-module";
import type { Contract } from "@/types/contract";
import type { ImmoDocument } from "@/types/document";
import type { Tenant } from "@/types/tenant";

const { createContractMock, deleteContractMock, updateContractMock } = vi.hoisted(() => ({
  createContractMock: vi.fn(),
  deleteContractMock: vi.fn(),
  updateContractMock: vi.fn(),
}));

vi.mock("@/features/contracts/services/contracts.service", () => ({
  createContract: createContractMock,
  deleteContract: deleteContractMock,
  updateContract: updateContractMock,
}));

const objects = [{ id: "obj-1", displayId: "WEG-001", name: "Sonnenhof" }];

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

const contracts: Contract[] = [
  {
    id: "contract-1",
    objectId: "obj-1",
    tenantId: "tenant-1",
    rentUnitId: "unit-1",
    title: "Wohnraummietvertrag",
    objectName: "Sonnenhof",
    objectDisplayId: "WEG-001",
    tenantName: "Anna Becker",
    unit: "WE 01",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "Aktiv",
  },
];

const documents: ImmoDocument[] = [
  {
    id: "doc-contract-1",
    title: "Wohnraummietvertrag Anna Becker",
    fileName: "vertrag.pdf",
    mimeType: "application/pdf",
    size: 1024,
    objectId: "obj-1",
    objectName: "WEG-001 · Sonnenhof",
    rentUnitId: "unit-1",
    unitLabel: "WE 01",
    reportYear: 2026,
    category: "Mietvertrag",
    status: "Vorhanden",
    uploadedBy: "Clara",
    downloadUrl: null,
    storagePath: null,
    fileAvailable: false,
    openIssues: ["Datei fehlt in der Ablage"],
    actionState: "file_missing",
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-01T10:00:00.000Z",
  },
];

describe("ContractsModule", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("shows object display id and unit in the contract list", () => {
    render(<ContractsModule contracts={contracts} objects={objects} tenants={tenants} documents={documents} />);

    expect(screen.getByText("WEG-001 · Sonnenhof · WE 01")).toBeInTheDocument();
    expect(screen.getByText("Anna Becker")).toBeInTheDocument();
  });

  it("shows the tenant-linked unit in the form after selecting an object and tenant", async () => {
    render(<ContractsModule contracts={contracts} objects={objects} tenants={tenants} documents={documents} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Vertrag anlegen" }));
    fireEvent.change(screen.getByDisplayValue("Objekt auswählen"), {
      target: { value: "obj-1" },
    });
    fireEvent.change(screen.getByDisplayValue("Mieter auswählen"), {
      target: { value: "tenant-1" },
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("WEG-001 · WE 01")).toBeInTheDocument();
    });
  });

  it("shows related contract document counts and a link into the document context", () => {
    render(<ContractsModule contracts={contracts} objects={objects} tenants={tenants} documents={documents} />);

    expect(screen.getByText("1 Mietvertragsdokumente · 1 offene Dokumentfälle")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dokumente" })).toHaveAttribute(
      "href",
      "/dokumente?objectId=obj-1&category=Mietvertrag&rentUnitId=unit-1",
    );
  });
});
