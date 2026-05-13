import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
};

vi.mock("@/lib/api/client", () => ({
  apiClient: apiClientMock,
}));

describe("contracts.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates contracts via the shared api client", async () => {
    const payload = {
      objectId: "obj-1",
      tenantId: "t-1",
      rentUnitId: "ru-1",
      title: "Mietvertrag 2026",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "Aktiv" as const,
    };

    apiClientMock.post.mockResolvedValueOnce({ id: "c-1", ...payload });

    const { createContract } = await import("./contracts.service");
    await expect(createContract(payload)).resolves.toEqual({ id: "c-1", ...payload });
    expect(apiClientMock.post).toHaveBeenCalledWith("/contracts", payload);
  });

  it("updates contracts via the shared api client", async () => {
    apiClientMock.patch.mockResolvedValueOnce({ id: "c-2", status: "In Prüfung" });

    const { updateContract } = await import("./contracts.service");
    await expect(updateContract("c-2", { tenantId: "t-3", status: "In Prüfung" })).resolves.toEqual({
      id: "c-2",
      status: "In Prüfung",
    });
    expect(apiClientMock.patch).toHaveBeenCalledWith("/contracts/c-2", { tenantId: "t-3", status: "In Prüfung" });
  });
});
