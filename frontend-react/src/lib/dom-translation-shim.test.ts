import { describe, it, expect, beforeAll } from "bun:test";
import { installDomTranslationShim } from "./dom-translation-shim";

beforeAll(() => {
  installDomTranslationShim();
});

describe("installDomTranslationShim", () => {
  it("leaves a normal removeChild working", () => {
    const parent = document.createElement("div");
    const child = document.createElement("span");
    parent.appendChild(child);

    expect(parent.removeChild(child)).toBe(child);
    expect(parent.childNodes.length).toBe(0);
  });

  it("returns the node instead of throwing when the parent no longer matches", () => {
    const parent = document.createElement("div");
    const stranger = document.createElement("span");
    document.createElement("div").appendChild(stranger);

    expect(() => parent.removeChild(stranger)).not.toThrow();
    expect(parent.removeChild(stranger)).toBe(stranger);
  });

  it("leaves a normal insertBefore working", () => {
    const parent = document.createElement("div");
    const reference = document.createElement("span");
    const inserted = document.createElement("b");
    parent.appendChild(reference);

    expect(parent.insertBefore(inserted, reference)).toBe(inserted);
    expect(parent.firstChild).toBe(inserted);
  });

  it("returns the new node instead of throwing when the reference has a different parent", () => {
    const parent = document.createElement("div");
    const inserted = document.createElement("b");
    const stranger = document.createElement("span");
    document.createElement("div").appendChild(stranger);

    expect(() => parent.insertBefore(inserted, stranger)).not.toThrow();
    expect(parent.insertBefore(inserted, stranger)).toBe(inserted);
  });

  it("still appends when insertBefore is given a null reference", () => {
    const parent = document.createElement("div");
    const appended = document.createElement("b");

    expect(parent.insertBefore(appended, null)).toBe(appended);
    expect(parent.lastChild).toBe(appended);
  });

  it("is safe to install more than once", () => {
    installDomTranslationShim();
    installDomTranslationShim();

    const parent = document.createElement("div");
    const child = document.createElement("span");
    parent.appendChild(child);
    expect(parent.removeChild(child)).toBe(child);
  });

  it("still throws for a non-Node argument instead of swallowing it", () => {
    const parent = document.createElement("div");

    expect(() => parent.removeChild({} as unknown as Node)).toThrow();
  });

  it("leaves the node attached to its real parent on the mismatch path", () => {
    const parent = document.createElement("div");
    const otherParent = document.createElement("div");
    const stranger = document.createElement("span");
    otherParent.appendChild(stranger);

    parent.removeChild(stranger);

    expect(stranger.parentNode).toBe(otherParent);
  });
});
