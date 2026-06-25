import { describe, it, expect, beforeEach } from "bun:test";
import { setLocaleCookie, getLocaleFromClient } from "@/lib/locale";

beforeEach(() => {
  // Clear the NEXT_LOCALE cookie before each test.
  document.cookie = "NEXT_LOCALE=; path=/; max-age=0";
});

describe("locale cookie", () => {
  it("defaults to 'th' when no cookie is set", () => {
    expect(getLocaleFromClient()).toBe("th");
  });

  it("round-trips a locale set via setLocaleCookie", () => {
    setLocaleCookie("en");
    expect(getLocaleFromClient()).toBe("en");
  });

  it("round-trips a non-ASCII locale through encode/decode", () => {
    setLocaleCookie("ไทย");
    expect(getLocaleFromClient()).toBe("ไทย");
  });
});
