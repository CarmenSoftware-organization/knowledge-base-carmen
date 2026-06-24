import { describe, it, expect, mock, afterEach } from "bun:test";
import { fetchWithTimeout } from "./fetch-utils";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchWithTimeout", () => {
  it("rejects (aborts) when the request exceeds the timeout", async () => {
    // A fetch that never resolves on its own but honors the abort signal.
    globalThis.fetch = mock((_input: unknown, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    }) as unknown as typeof fetch;

    await expect(fetchWithTimeout("http://example.test", {}, 20)).rejects.toThrow();
  });

  it("returns the response when fetch resolves before the timeout", async () => {
    const resp = new Response("ok", { status: 200 });
    globalThis.fetch = mock(async () => resp) as unknown as typeof fetch;

    const r = await fetchWithTimeout("http://example.test", {}, 1000);
    expect(r.status).toBe(200);
  });
});
