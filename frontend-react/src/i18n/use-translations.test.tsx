import { describe, it, expect, beforeAll } from "bun:test";
import { renderHook } from "@testing-library/react";
import i18n from "./index";
import { useTranslations } from "./use-translations";

// i18next initializes once at import time with lng from cookie.
// In jsdom there is no cookie, so getLocaleFromClient() returns "th".
// Force English deterministically before tests run.
beforeAll(async () => {
  await i18n.changeLanguage("en");
});

describe("useTranslations compat", () => {
  it("resolves a dotted key without namespace", () => {
    const { result } = renderHook(() => useTranslations());
    expect(result.current("common.home")).toBe("Home");
  });
  it("prefixes the namespace", () => {
    const { result } = renderHook(() => useTranslations("common"));
    expect(result.current("home")).toBe("Home");
  });
});
