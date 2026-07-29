/**
 * Let React survive a DOM-mutating translator.
 *
 * Google's Website Translator replaces text nodes in place, wrapping them in
 * <font> elements. React still holds references to the originals, so when it
 * later removes or reorders those children it calls removeChild/insertBefore
 * with a node whose parent changed underneath it, and the DOM throws
 * NotFoundError. React has no recovery: the error reaches the nearest
 * boundary and the page is replaced by an error screen
 * (facebook/react#11538, open since 2017).
 *
 * Returning instead of throwing when the parent no longer matches is the
 * established workaround. It is not a free lunch: usually Google moves the
 * text node *into* a <font> that stays in the tree, so parentNode becomes
 * the <font>, not null. The mismatch path therefore routinely returns a node
 * that is still in the document — the removal genuinely did not happen.
 * Reachable consequence: React swaps a text-node child in place while
 * translated, the stale <font> stays, and the reader sees duplicated text.
 * Symmetrically, a dropped insertBefore can leave content missing. That is
 * still the trade worth making against the whole page being replaced by an
 * error screen, but it is a trade, not a clean recovery.
 *
 * realm note: the `instanceof Node` checks below are realm-scoped — a node
 * from a different document (e.g. inside an iframe) would fail `instanceof`
 * against this realm's `Node` and take the escape-hatch return instead of
 * the native path. Harmless here because this app never mounts a React tree
 * inside an iframe.
 *
 * This patches a DOM prototype and deserves the suspicion that implies. It is
 * scoped as narrowly as the failure allows: two methods, one guard each, and
 * no behavioural change whatsoever when the parent matches. Non-Node
 * arguments are deliberately left to fail against the original method, so a
 * genuine caller bug (passing `{}`, a string, `undefined`) still throws
 * loudly instead of being swallowed into a silent no-op.
 */

let installed = false;

/**
 * Clobber-safe `parentNode` reader, captured the same way DOMPurify captures
 * its own `getParentNode` (see `_forceRemove` in dompurify's source): as the
 * prototype's own getter, read once here rather than through the instance.
 * `HTMLFormElement`'s named-property getter is `[LegacyOverrideBuiltIns]`, so
 * `<form><input name="parentNode"></form>` makes `form.parentNode` return the
 * input, not the real parent — reading `child.parentNode` directly can be
 * clobbered by page content (including sanitizer input). Reading through the
 * prototype's own accessor bypasses that.
 *
 * `typeof Node` (not a direct reference) so importing this module in an
 * environment with no DOM at all does not throw at import time — same
 * defensive style as the `typeof Node !== "function"` guard below. If the
 * descriptor is unavailable for any reason, `nativeParentNode` stays
 * `undefined` and both guards below fall through to the *original*
 * removeChild/insertBefore instead of taking the "parent mismatch" escape
 * hatch — the safe direction. Relying on `undefined !== this` happening to
 * be true would silently no-op a legitimate removal/insertion instead.
 */
const nativeParentNode: (() => Node | null) | undefined =
  typeof Node === "function" && Node.prototype
    ? Object.getOwnPropertyDescriptor(Node.prototype, "parentNode")?.get
    : undefined;

export function installDomTranslationShim(): void {
  if (installed) return;
  if (typeof Node !== "function" || !Node.prototype) return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (
      nativeParentNode &&
      child instanceof Node &&
      nativeParentNode.call(child) !== this
    ) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (
      nativeParentNode &&
      referenceNode instanceof Node &&
      nativeParentNode.call(referenceNode) !== this
    ) {
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
