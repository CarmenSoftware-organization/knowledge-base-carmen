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

  // Pins the fix for the clobbered-`parentNode` read: a <form> with a child
  // named "parentNode" can turn `form.parentNode` into that child instead of
  // the real parent (HTMLFormElement's named-property getter is
  // [LegacyOverrideBuiltIns]). The shim must read the real parent through the
  // clobber-safe prototype accessor, the same way DOMPurify's `getParentNode`
  // does, or it mistakes a legitimately-parented form for a mismatch and
  // returns it un-removed. See the note on `nativeParentNode` in
  // dom-translation-shim.ts for why that matters for sanitizer output.
  //
  // NOTE: happy-dom does not implement the named-property clobbering override
  // for <form> itself — `form.parentNode` already returns the real parent
  // with a child named "parentNode" present, so a plain "append a form with
  // such a child, remove it" test would pass identically against the
  // pre-fix `child.parentNode` code, proving nothing. The
  // `Object.defineProperty` call below simulates the override directly (an
  // own property shadows the prototype's getter for a plain `form.parentNode`
  // read, but not for `nativeParentNode.call(form)`, which invokes the
  // prototype's getter directly) — verified to produce a genuine red/green in
  // this environment: reverting the shim to `child.parentNode` makes this
  // test fail, because the simulated clobber wins for a plain property read.
  it("removes a form whose parentNode getter is clobbered by a same-named child", () => {
    const parent = document.createElement("div");
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.setAttribute("name", "parentNode");
    form.appendChild(input);
    parent.appendChild(form);

    // Simulates what HTMLFormElement's [LegacyOverrideBuiltIns] named-property
    // getter does in a real browser: a same-named child shadows `parentNode`.
    Object.defineProperty(form, "parentNode", { value: input, configurable: true });

    expect(parent.removeChild(form)).toBe(form);
    expect(parent.childNodes.length).toBe(0);
  });
});
