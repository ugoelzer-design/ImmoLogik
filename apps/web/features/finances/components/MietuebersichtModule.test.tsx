import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MietuebersichtModule } from "./MietuebersichtModule";

const { getRentUnitsMock, createRentUnitMock, deleteRentUnitMock } = vi.hoisted(() => ({
  getRentUnitsMock: vi.fn(),
  createRentUnitMock: vi.fn(),
  deleteRentUnitMock: vi.fn(),
}));

vi.mock("@/features/finances/services/rent-units.service", () => ({
  getRentUnits: getRentUnitsMock,
  createRentUnit: createRentUnitMock,
  deleteRentUnit: deleteRentUnitMock,
}));

const existingUnit = {
  id: "unit-1",
  objectId: "obj-1",
  unitLabel: "WE 01",
  tenant: "Anna Weber",
  sollMiete: 1200,
  istMiete: 1000,
  zahlungsStatus: "Rückstand",
  faelligAm: "2026-04-01",
};

describe("MietuebersichtModule", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads units and shows the aggregate totals", async () => {
    getRentUnitsMock.mockResolvedValueOnce([existingUnit]);

    render(<MietuebersichtModule />);

    expect(await screen.findByText("WE 01")).toBeInTheDocument();
    expect(screen.getByText("Soll-Miete").nextElementSibling).toHaveTextContent("1200.00 €");
    expect(screen.getByText("Ist-Miete").nextElementSibling).toHaveTextContent("1000.00 €");
    expect(screen.getAllByText("Rückstand")[0]?.nextElementSibling).toHaveTextContent("200.00 €");
  });

  it("creates a new rent unit from the form", async () => {
    getRentUnitsMock.mockResolvedValueOnce([]);
    createRentUnitMock.mockResolvedValueOnce({
      id: "unit-2",
      objectId: "obj-2",
      unitLabel: "WE 02",
      tenant: "Bernd Klein",
      sollMiete: 950,
      istMiete: 0,
      zahlungsStatus: "Offen",
      faelligAm: "2026-05-01",
    });

    render(<MietuebersichtModule />);

    expect(await screen.findByText("Keine Einheiten vorhanden.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Einheit anlegen" }));

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "obj-2" } });
    fireEvent.change(inputs[1], { target: { value: "WE 02" } });
    fireEvent.change(inputs[2], { target: { value: "Bernd Klein" } });
    fireEvent.change(inputs[3], { target: { value: "950" } });
    fireEvent.change(inputs[4], { target: { value: "0" } });
    fireEvent.change(inputs[5], { target: { value: "2026-05-01" } });

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => {
      expect(createRentUnitMock).toHaveBeenCalledWith({
        objectId: "obj-2",
        unitLabel: "WE 02",
        tenant: "Bernd Klein",
        sollMiete: 950,
        istMiete: 0,
        zahlungsStatus: "Offen",
        faelligAm: "2026-05-01",
      });
    });

    expect(await screen.findByText("WE 02")).toBeInTheDocument();
  });

  it("shows an error when deleting a unit fails", async () => {
    getRentUnitsMock.mockResolvedValueOnce([existingUnit]);
    deleteRentUnitMock.mockRejectedValueOnce(new Error("boom"));

    render(<MietuebersichtModule />);

    expect(await screen.findByText("WE 01")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "✕" }));

    expect(await screen.findByText("Mieteinheit konnte nicht gelöscht werden.")).toBeInTheDocument();
    expect(screen.getByText("WE 01")).toBeInTheDocument();
  });

  i