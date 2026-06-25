import { describe, it, expect, mock, spyOn, afterEach } from "bun:test";
import { apiJson, fetchWithTimeout, ApiError } from "@/lib/fetch-utils";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchWithTimeout", () => {
  it("passes an AbortSignal to fetch", async () => {
    let received: RequestInit | undefined;
    globalThis.fetch = mock(async (_input: unknown, init: RequestInit) => {
      received = init;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    await fetchWithTimeout("http://x/", {}, 1000);
    expect(received?.signal).toBeInstanceOf(AbortSignal);
  });

  it("aborts the request when the timeout elapses", async () => {
    globalThis.fetch = mock(
      (_input: unknown, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;

    await expect(fetchWithTimeout("http://x/", {}, 5)).rejects.toThrow();
  });

  it("clears the timeout timer after a successful response", async () => {
    const clearSpy = spyOn(globalThis, "clearTimeout");
    globalThis.fetch = mock(
      async () => new Response("{}", { status: 200 }),
    ) as unknown as typeof fetch;

    await fetchWithTimeout("http://x/", {}, 1000);
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe("apiJson", () => {
  it("unwraps a successful envelope into { data, meta }", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(
          JSON.stringify({ success: true, data: { a: 1 }, meta: { total: 3 } }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const out = await apiJson<{ a: number }>("http://x/");
    expect(out.data).toEqual({ a: 1 });
    expect(out.meta).toEqual({ total: 3 });
  });

  it("throws ApiError with code and status on success:false", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(
          JSON.stringify({ success: false, error: { code: "BAD", message: "nope" } }),
          { status: 400 },
        ),
    ) as unknown as typeof fetch;

    try {
      await apiJson("http://x/");
      throw new Error("expected apiJson to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("BAD");
      expect((e as ApiError).status).toBe(400);
    }
  });

  it("returns a legacy flat body unchanged when there is no success flag and res.ok", async () => {
    globalThis.fetch = mock(
      async () => new Response(JSON.stringify({ items: [1, 2] }), { status: 200 }),
    ) as unknown as typeof fetch;

    const out = await apiJson<{ items: number[] }>("http://x/");
    expect(out.data).toEqual({ items: [1, 2] });
  });

  it("throws ApiError('HTTP_ERROR') for a flat body when res is not ok", async () => {
    globalThis.fetch = mock(
      async () => new Response(JSON.stringify({ whatever: true }), { status: 500 }),
    ) as unknown as typeof fetch;

    try {
      await apiJson("http://x/");
      throw new Error("expected apiJson to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("HTTP_ERROR");
      expect((e as ApiError).status).toBe(500);
    }
  });

  it("treats invalid JSON as a null body and returns { data: null } when res.ok", async () => {
    globalThis.fetch = mock(
      async () => new Response("not json", { status: 200 }),
    ) as unknown as typeof fetch;

    const out = await apiJson("http://x/");
    expect(out.data).toBeNull();
  });
});
