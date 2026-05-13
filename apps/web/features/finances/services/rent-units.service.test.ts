import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = {
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
};

vi.mock("@/lib/api/client", () => ({
  apiClient: apiClientMock,
}));

describe("rent-units.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads rent units via the shared api client", async () => {
    const units = [{ id: "ru-1", unitLabel: "WE 01" }];
    apiClientMock.get.mockResolvedValueOnce(units);

    const { getRentUnits } = await import("./rent-units.service");
    await expect(getRentUnits()).resolves.toEqual(units);
    expect(apiClientMock.get).toHaveBeenCalledWith("/rent-units");
  });

  it("creates rent units via the shared api client", async () => {
    const payload = {
      objectId: "obj-1",
      unitLabel: "WE 01",
      tenant: "Anna",
      sollMiete: 1200,
      faelligAm: "2026-04-01",
    };
    const created = { id: "ru-2", ...payload, istMiete: 0, zahlungsStatus: "Offen" };
    apiClientMock.post.mockResolvedValueOnce(created);

    const { createRentUnit } = await import("./rent-units.service");
    await expect(createRentUnit(payload)).resolves.toEqual(created);
    expect(apiClientMock.post).toHaveBeenCalledWith("/rent-units", payload);
  });
});
