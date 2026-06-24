import { expect } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";

// DOMPurify and the security tests need a window/document.
GlobalRegistrator.register({ url: "http://localhost/" });

// jest-dom matchers on bun:test's expect.
expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);

// Snapshot NodeIterator — required by DOMPurify under happy-dom.
// happy-dom returns a LIVE NodeIterator; when DOMPurify removes a forbidden node
// mid-walk the iterator skips remaining siblings, so XSS slips through unsanitized.
// A snapshot iterator (full node list collected before the walk) fixes it.
// DOMPurify captures createNodeIterator at module-load, so this must run in the preload.
{
  let _proto = Object.getPrototypeOf(document) as object | null;
  while (_proto !== null) {
    if (Object.getOwnPropertyDescriptor(_proto, "createNodeIterator")) {
      Object.defineProperty(_proto, "createNodeIterator", {
        value(root: Node, whatToShow = 0xffff_ffff) {
          const nodes: Node[] = [];
          const walk = (n: Node) => {
            if (whatToShow & (1 << (n.nodeType - 1))) nodes.push(n);
            let c = n.firstChild;
            while (c) { walk(c); c = c.nextSibling; }
          };
          walk(root);
          let i = -1;
          return {
            root, whatToShow, filter: null, referenceNode: root,
            pointerBeforeReferenceNode: true,
            nextNode: () => (++i < nodes.length ? nodes[i] : null),
            previousNode: () => (--i >= 0 ? nodes[i] : null),
            detach: () => {},
          } as NodeIterator;
        },
        configurable: true, writable: true,
      });
      break;
    }
    _proto = Object.getPrototypeOf(_proto) as object | null;
  }
}
