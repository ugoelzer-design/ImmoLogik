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

describe("tenants.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates tenants via the shared api client", async () => {
    const payload = {
      objectId: "obj-1",
      rentUnitId: "ru-1",
      fullName: "Anna Weber",
      email: "anna@example.com",
      phone: "12345",
      status: "Aktiv" as const,
    };

    apiClientMock.post.mockResolvedValueOnce({ id: "t-1", ...payload });

    const { createTenant } = await import("./tenants.service");
    await expect(createTenant(payload)).resolves.toEqual({ id: "t-1", ...payload });
    expect(apiClientMock.post).toHaveBeenCalledWith("/tenants", payload);
  });

  it("updates tenants via the shared api client", async () => {
    apiClientMock.patch.mockResolvedValueOnce({ id: "t-2", status: "Beendet" });

    const { updateTenant } = await import("./tenants.service");
    await expect(updateTenant("t-2", { rentUnitId: "ru-2", status: "Beendet" })).resolves.toEqual({
      id: "t-2",
      status: "Beendet",
    });
    expect(apiClientMock.patch).toHaveBeenCalledWith("/tenants/t-2", { rentUnitId: "ru-2", status: "Beendet" });
  });
});
