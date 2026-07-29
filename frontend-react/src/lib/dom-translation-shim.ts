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
 * established workaround. It is not a lie to React: the node it wanted
 * removed is already detached — the translator moved it — so returning it
 * reports the outcome React was asking for.
 *
 * This patches a DOM prototype and deserves the suspicion that implies. It is
 * scoped as narrowly as the failure allows: two methods, one guard each, and
 * no behavioural change whatsoever when the parent matches.
 */

let installed = false;

export function installDomTranslationShim(): void {
  if (installed) return;
  if (typeof Node !== "function" || !Node.prototype) return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
