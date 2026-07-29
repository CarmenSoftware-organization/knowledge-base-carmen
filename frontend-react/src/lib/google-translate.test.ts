import { describe, it, expect, beforeEach } from "bun:test";
import {
  TRANSLATE_SOURCE_LANG,
  getTranslateLang,
  setTranslateLang,
  clearTranslateLang,
} from "./google-translate";

beforeEach(() => {
  document.cookie = "googtrans=; path=/; max-age=0";
});

describe("getTranslateLang", () => {
  it("returns the source language when no cookie is set", () => {
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });

  it("reads the target out of a well-formed cookie", () => {
    document.cookie = "googtrans=/th/ja; path=/";
    expect(getTranslateLang()).toBe("ja");
  });

  it("reads a hyphenated language code", () => {
    document.cookie = "googtrans=/th/zh-CN; path=/";
    expect(getTranslateLang()).toBe("zh-CN");
  });

  it("falls back to the source language on a malformed value", () => {
    document.cookie = "googtrans=garbage; path=/";
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });

  it("falls back to the source language on an empty target", () => {
    document.cookie = "googtrans=/th/; path=/";
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });
});

describe("setTranslateLang", () => {
  it("round-trips a target language", () => {
    setTranslateLang("ja");
    expect(getTranslateLang()).toBe("ja");
  });

  it("clears rather than writing /th/th when given the source language", () => {
    setTranslateLang("ja");
    setTranslateLang(TRANSLATE_SOURCE_LANG);
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
    expect(document.cookie).not.toContain("/th/th");
  });

  it("clears when given an empty code", () => {
    setTranslateLang("ja");
    setTranslateLang("");
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });
});

describe("clearTranslateLang", () => {
  it("removes an active translation", () => {
    setTranslateLang("ja");
    clearTranslateLang();
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });

  it("is safe to call when nothing is set", () => {
    clearTranslateLang();
    expect(getTranslateLang()).toBe(TRANSLATE_SOURCE_LANG);
  });
});
