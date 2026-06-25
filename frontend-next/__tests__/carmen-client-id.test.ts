import { describe, it, expect, beforeEach } from "bun:test";
import { getOrCreateClientId } from "@/lib/carmen-client-id";

beforeEach(() => {
  localStorage.clear();
});

describe("getOrCreateClientId", () => {
  it("creates an anon_ id and persists it to localStorage", () => {
    const id = getOrCreateClientId();
    expect(id.startsWith("anon_")).toBe(true);
    expect(localStorage.getItem("carmen_client_id")).toBe(id);
  });

  it("returns the same id on subsequent calls", () => {
    const first = getOrCreateClientId();
    const second = getOrCreateClientId();
    expect(second).toBe(first);
  });
});
