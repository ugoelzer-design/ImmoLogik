import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  patch: vi.fn(),
};

vi.mock("@/lib/api/client", () => ({
  apiClient: apiClientMock,
}));

describe("utility-statements.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads the persisted utility statements workspace via the shared api client", async () => {
    const workspace = {
      settlements: [
        {
          id: "BKA-ENTWURF-001",
          objektDisplayId: "WEG-001",
          objektName: "Sonnenhof",
        },
      ],
    };
    apiClientMock.get.mockResolvedValueOnce(workspace);

    const { getUtilityStatementsWorkspace } = await import("./utility-statements.service");

    await expect(getUtilityStatementsWorkspace()).resolves.toEqual(workspace);
    expect(apiClientMock.get).toHaveBeenCalledWith("/utility-statements/workspace");
  });

  it("loads the utility statements list with server-side filters", async () => {
    const response = {
      settlements: [
        {
          id: "BKA-2025-001",
          objektDisplayId: "WEG-001",
          objektName: "Sonnenhof",
          reportYear: 2025,
          status: "In Arbeit",
        },
      ],
    };
    apiClientMock.get.mockResolvedValueOnce(response);

    const { listUtilityStatements } = await import("./utility-statements.service");

    await expect(
      listUtilityStatements({
        q: "sonnen",
        objectDisplayId: "WEG-001",
        status: "AKTIV",
        reportYear: "2025",
      }),
    ).resolves.toEqual(response);
    expect(apiClientMock.get).toHaveBeenCalledWith("/utility-statements", {
      query: {
        q: "sonnen",
        objectDisplayId: "WEG-001",
        status: "AKTIV",
        reportYear: "2025",
      },
    });
  });

  it("loads the server-side approval validation for one utility statement", async () => {
    const response = {
      isReadyForApproval: false,
      issues: [{ code: "units_missing", message: "Keine Abrechnungseinheiten vorhanden." }],
      metrics: {
        activePositionsCount: 0,
        unitsCount: 0,
        totalAmount: 0,
        totalAdvancePayments: 0,
      },
    };
    apiClientMock.get.mockResolvedValueOnce(response);

    const { getUtilityStatementValidation } = await import("./utility-statements.service");

    await expect(getUtilityStatementValidation("BKA-2025-001")).resolves.toEqual(response);
    expect(apiClientMock.get).toHaveBeenCalledWith(
      "/utility-statements/BKA-2025-001/validation",
    );
  });

  it("syncs the current utility statements workspace via put", async () => {
    const payload = {
      settlements: [
        {
          id: "BKA-ENTWURF-001",
          objectId: "obj-1",
          objektDisplayId: "WEG-001",
          objektName: "Sonnenhof",
          zeitraumVon: "2025-01-01",
          zeitraumBis: "2025-12-31",
          status: "In Arbeit",
          erstelltAm: "06.04.2026",
          geaendertAm: "06.04.2026",
          positions: [],
          einheiten: [],
          finalReportSnapshot: null,
        },
      ],
    } as const;
    apiClientMock.put.mockResolvedValueOnce(payload);

    const { syncUtilityStatementsWorkspace } = await import("./utility-statements.service");

    await expect(syncUtilityStatementsWorkspace(payload)).resolves.toEqual(payload);
    expect(apiClientMock.put).toHaveBeenCalledWith("/utility-statements/workspace", payload);
  });

  it("approves a single utility statement via post", async () => {
    const payload = {
      id: "BKA-ENTWURF-001",
      objectId: "obj-1",
      objektDisplayId: "WEG-001",
      objektName: "Sonnenhof",
      zeitraumVon: "2025-01-01",
      zeitraumBis: "2025-12-31",
      status: "Archiviert",
      erstelltAm: "06.04.2026",
      geaendertAm: "06.04.2026",
      positivGeprueftAm: "06.04.2026",
      positions: [],
      einheiten: [],
      finalReportSnapshot: {
        freigegebenAm: "06.04.2026",
        report: { id: "report-1" },
      },
    } as const;
    apiClientMock.post.mockResolvedValueOnce(payload);

    const { approveUtilityStatement } = await import("./utility-statements.service");

    await expect(approveUtilityStatement(payload.id, payload)).resolves.toEqual(payload);
    expect(apiClientMock.post).toHaveBeenCalledWith(
      "/utility-statements/BKA-ENTWURF-001/approve",
      payload,
    );
  });
});
