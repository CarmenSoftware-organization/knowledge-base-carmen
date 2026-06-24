import { describe, it, expect, beforeEach } from "bun:test";
import { setLocaleCookie, getLocaleFromClient } from "./locale";

beforeEach(() => {
  document.cookie = "NEXT_LOCALE=; max-age=0; path=/";
});

describe("locale", () => {
  it("defaults to th when no cookie", () => {
    expect(getLocaleFromClient()).toBe("th");
  });
  it("round-trips a set locale", () => {
    setLocaleCookie("en");
    expect(getLocaleFromClient()).toBe("en");
  });
  it("dispatches locale-changed on set", () => {
    let fired = false;
    window.addEventListener("locale-changed", () => (fired = true), { once: true });
    setLocaleCookie("th");
    expect(fired).toBe(true);
  });
});
