import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NebenkostenOverview } from "./NebenkostenOverview";

const { listUtilityStatementsMock } = vi.hoisted(() => ({
  listUtilityStatementsMock: vi.fn(),
}));

vi.mock("../services/utility-statements.service", () => ({
  listUtilityStatements: listUtilityStatementsMock,
}));

describe("NebenkostenOverview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows settlement metrics and recent settlements", async () => {
    listUtilityStatementsMock.mockResolvedValueOnce({
      settlements: [
        {
          id: "bka-1",
          objektDisplayId: "WEG-001",
          objektName: "Sonnenhof",
          zeitraumVon: "2026-01-01",
          zeitraumBis: "2026-12-31",
          reportYear: 2026,
          status: "In Arbeit",
          erstelltAm: "2026-06-01",
          geaendertAm: "2026-06-10",
        },
        {
          id: "bka-2",
          objektDisplayId: "WEG-002",
          objektName: "Mainufer",
          zeitraumVon: "2025-01-01",
          zeitraumBis: "2025-12-31",
          reportYear: 2025,
          status: "Archiviert",
          erstelltAm: "2026-01-01",
          geaendertAm: "2026-02-02",
        },
      ],
    });

    render(<NebenkostenOverview />);

    expect(await screen.findByText("Sonnenhof")).toBeInTheDocument();
    expect(screen.getByText("Mainufer")).toBeInTheDocument();
    expect(screen.getByText("Abrechnungen").nextElementSibling).toHaveTextContent("2");
    expect(screen.getAllByText("In Arbeit")[0]?.nextElementSibling).toHaveTextContent("1");
    expect(screen.getAllByText("Archiviert")[0]?.nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Jahre").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Zuletzt geändert: 10.6.2026")).toBeInTheDocument();
  });

  it("shows a load error", async () => {
    listUtilityStatementsMock.mockRejectedValueOnce(new Error("boom"));

    render(<NebenkostenOverview />);

    expect(await screen.findByText("Nebenkostenübersicht konnte nicht geladen werden.")).toBeInTheDocument();
  });
});
