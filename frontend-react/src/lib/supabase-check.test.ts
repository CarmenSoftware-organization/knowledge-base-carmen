import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { fetchChatHistoryCount, SupabaseCheckError } from "./supabase-check";

const metaEnv = (import.meta as unknown as { env: Record<string, unknown> }).env;
const realFetch = globalThis.fetch;

const URL_VAL = "https://example.supabase.co";
const KEY_VAL = "anon-test-key";

beforeEach(() => {
  metaEnv.VITE_SUPABASE_URL = URL_VAL;
  metaEnv.VITE_SUPABASE_ANON_KEY = KEY_VAL;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete metaEnv.VITE_SUPABASE_URL;
  delete metaEnv.VITE_SUPABASE_ANON_KEY;
});

describe("fetchChatHistoryCount", () => {
  it("returns the count and calls the RPC endpoint with the anon key", async () => {
    let calledUrl = "";
    let calledInit: RequestInit | undefined;
    globalThis.fetch = mock((input: unknown, init?: RequestInit) => {
      calledUrl = String(input);
      calledInit = init;
      return Promise.resolve(new Response("1234", { status: 200 }));
    }) as unknown as typeof fetch;

    const count = await fetchChatHistoryCount();

    expect(count).toBe(1234);
    expect(calledUrl).toBe(
      "https://example.supabase.co/rest/v1/rpc/get_chat_history_count",
    );
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers.apikey).toBe(KEY_VAL);
    expect(headers.Authorization).toBe(`Bearer ${KEY_VAL}`);
    expect(calledInit?.method).toBe("POST");
  });

  it("parses a bigint returned as a quoted string", async () => {
    globalThis.fetch = mock(async () =>
      new Response('"4096"', { status: 200 }),
    ) as unknown as typeof fetch;
    expect(await fetchChatHistoryCount()).toBe(4096);
  });

  it("throws an env error and does not fetch when config is missing", async () => {
    delete metaEnv.VITE_SUPABASE_URL;
    delete metaEnv.VITE_SUPABASE_ANON_KEY;
    let called = false;
    globalThis.fetch = mock(async () => {
      called = true;
      return new Response("1");
    }) as unknown as typeof fetch;

    const err = (await fetchChatHistoryCount().catch((e) => e)) as SupabaseCheckError;
    expect(err).toBeInstanceOf(SupabaseCheckError);
    expect(err.kind).toBe("env");
    expect(called).toBe(false);
  });

  it("throws a network error when fetch rejects", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new TypeError("failed")),
    ) as unknown as typeof fetch;
    const err = (await fetchChatHistoryCount().catch((e) => e)) as SupabaseCheckError;
    expect(err.kind).toBe("network");
  });

  it("throws an http error carrying the status", async () => {
    globalThis.fetch = mock(async () =>
      new Response("no key", { status: 401 }),
    ) as unknown as typeof fetch;
    const err = (await fetchChatHistoryCount().catch((e) => e)) as SupabaseCheckError;
    expect(err).toBeInstanceOf(SupabaseCheckError);
    expect(err.kind).toBe("http");
    expect(err.status).toBe(401);
  });

  it("throws a parse error when the body is not a number", async () => {
    globalThis.fetch = mock(async () =>
      new Response("not-json", { status: 200 }),
    ) as unknown as typeof fetch;
    const err = (await fetchChatHistoryCount().catch((e) => e)) as SupabaseCheckError;
    expect(err.kind).toBe("parse");
  });
});
