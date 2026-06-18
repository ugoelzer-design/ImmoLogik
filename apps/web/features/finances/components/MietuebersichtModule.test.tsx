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
    expect(screen.getByText("Soll-Miete").nextElementSibling).toHaveTextContent("1.200,00 €");
    expect(screen.getByText("Ist-Miete").nextElementSibling).toHaveTextContent("1.000,00 €");
    expect(screen.getAllByText("Rückstand")[0]?.nextElementSibling).toHaveTextContent("200,00 €");
    expect(screen.getByText("Klärung").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("1 mit Differenz")).toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText("Objekt-ID"), { target: { value: "obj-2" } });
    fireEvent.change(screen.getByLabelText("Einheit"), { target: { value: "WE 02" } });
    fireEvent.change(screen.getByLabelText("Mieter"), { target: { value: "Bernd Klein" } });
    fireEvent.change(screen.getByLabelText("Soll-Miete"), { target: { value: "950" } });
    fireEvent.change(screen.getByLabelText("Ist-Miete"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Fällig am"), { target: { value: "2026-05-01" } });

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
    fireEvent.click(screen.getByRole("button", { name: "WE 01 löschen" }));

    expect(await screen.findByText("Mieteinheit konnte nicht gelöscht werden.")).toBeInTheDocument();
    expect(screen.getByText("WE 01")).toBeInTheDocument();
  });

  it("blocks invalid rent unit values before calling the api", async () => {
    getRentUnitsMock.mockResolvedValueOnce([]);

    render(<MietuebersichtModule />);

    expect(await screen.findByText("Keine Einheiten vorhanden.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Einheit anlegen" }));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByText("Objekt-ID ist erforderlich.")).toBeInTheDocument();
    expect(createRentUnitMock).not.toHaveBeenCalled();
  });

  it("filters rent units by search text and payment status", async () => {
    getRentUnitsMock.mockResolvedValueOnce([
      existingUnit,
      {
        ...existingUnit,
        id: "unit-2",
        unitLabel: "WE 02",
        tenant: "Bernd Klein",
        zahlungsStatus: "Bezahlt",
        istMiete: 1200,
      },
    ]);

    render(<MietuebersichtModule />);

    expect(await screen.findByText("WE 01")).toBeInTheDocument();
    expect(screen.getByText("WE 02")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Mieteinheiten suchen"), {
      target: { value: "Bernd" },
    });

    expect(screen.queryByText("WE 01")).not.toBeInTheDocument();
    expect(screen.getByText("WE 02")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Zahlungsstatus filtern"), {
      target: { value: "Rückstand" },
    });

    expect(screen.getByText("Keine Mieteinheiten passen zur Suche.")).toBeInTheDocument();
  });
});
