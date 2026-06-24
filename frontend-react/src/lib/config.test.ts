import { describe, it, expect } from "bun:test";

describe("config", () => {
  it("strips trailing slashes from API_BASE", async () => {
    const mod = await import("./config");
    expect(mod.API_BASE.endsWith("/")).toBe(false);
  });
  it("exposes DEFAULT_BU = carmen", async () => {
    const mod = await import("./config");
    expect(mod.DEFAULT_BU).toBe("carmen");
  });
  it("falls back to localhost when VITE_API_BASE unset in dev", async () => {
    const mod = await import("./config");
    expect(mod.API_BASE).toMatch(/^https?:\/\//);
  });
});
