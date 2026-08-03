import { describe, it, expect } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useTranslations } from "./use-translations";

describe("useTranslations compat", () => {
  it("resolves a dotted key without namespace", () => {
    const { result } = renderHook(() => useTranslations());
    expect(result.current("common.home")).toBe("หน้าหลัก");
  });
  it("prefixes the namespace", () => {
    const { result } = renderHook(() => useTranslations("common"));
    expect(result.current("home")).toBe("หน้าหลัก");
  });
});
