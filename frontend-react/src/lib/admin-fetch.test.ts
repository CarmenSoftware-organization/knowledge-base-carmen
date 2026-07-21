import { describe, it, expect, jest, beforeEach } from "bun:test";
import { adminApiJson } from "./admin-fetch";
import { getAdminKey, setAdminKey } from "./admin-auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("adminApiJson", () => {
  beforeEach(() => sessionStorage.clear());

  it("injects the X-Admin-Key header from sessionStorage", async () => {
    setAdminKey("my-key");
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ success: true, data: { ok: 1 } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await adminApiJson("/api/x");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Admin-Key"]).toBe("my-key");
  });

  it("clears the key and throws on 401", async () => {
    setAdminKey("my-key");
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ success: false, error: { code: "UNAUTHORIZED", message: "no" } }, 401)) as unknown as typeof fetch;

    await expect(adminApiJson("/api/x")).rejects.toThrow();
    expect(getAdminKey()).toBeNull();
  });
});
