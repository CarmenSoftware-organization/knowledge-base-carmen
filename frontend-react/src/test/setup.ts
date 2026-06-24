import { expect } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";

// Register a DOM before any test imports a component.
// url: 'http://localhost/' is required so that document.cookie works
// (happy-dom refuses to store cookies for about:blank).
GlobalRegistrator.register({ url: "http://localhost/" });

// jest-dom matchers (toBeInTheDocument, etc.) on bun:test's expect.
expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);

// Vite injects these; bun test does not. Mirror dev defaults so config.ts behaves.
const env = (import.meta as unknown as { env: Record<string, unknown> }).env;
env.MODE = "test";
env.DEV = true;
env.PROD = false;

// jsdom/happy-dom gaps used by framer-motion's viewport feature.
if (typeof window.IntersectionObserver === "undefined") {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

// Snapshot NodeIterator — required by DOMPurify under happy-dom.
//
// happy-dom@20.10.6 returns a LIVE NodeIterator from createNodeIterator.  When
// DOMPurify removes a forbidden node (e.g. <script>) mid-walk the iterator
// loses its position and skips every remaining sibling — so <img onerror> and
// <a href="javascript:"> slip through unsanitized.  Replacing it with a
// snapshot iterator (full node list collected before the walk) fixes it.
//
// Without this shim, src/lib/dompurify-security.test.ts FAILS on the current
// tree: `expect(clean).not.toMatch(/<script/i)` receives the raw, unsanitized
// markup (26 pass / 1 fail observed on happy-dom 20.10.6, bun 1.3.14,
// dompurify 3.4.11).  DOMPurify captures createNodeIterator at module-load
// time, so this must run before any test imports DOMPurify (the preload does).
//
// Scoped narrowly to createNodeIterator (which @testing-library/dom does not
// use for queries), so it carries no blast radius for component-render tests.
{
  let _proto = Object.getPrototypeOf(document) as object | null;
  while (_proto !== null) {
    if (Object.getOwnPropertyDescriptor(_proto, "createNodeIterator")) {
      Object.defineProperty(_proto, "createNodeIterator", {
        value(root: Node, whatToShow = 0xffff_ffff) {
          // Snapshot the subtree before any mutations occur.
          const nodes: Node[] = [];
          const walk = (n: Node) => {
            if (whatToShow & (1 << (n.nodeType - 1))) nodes.push(n);
            let c = n.firstChild;
            while (c) { walk(c); c = c.nextSibling; }
          };
          walk(root);
          let i = -1;
          return {
            root,
            whatToShow,
            filter: null,
            referenceNode: root,
            pointerBeforeReferenceNode: true,
            nextNode: () => (++i < nodes.length ? nodes[i] : null),
            previousNode: () => (--i >= 0 ? nodes[i] : null),
            detach: () => {},
          } as NodeIterator;
        },
        configurable: true,
        writable: true,
      });
      break;
    }
    _proto = Object.getPrototypeOf(_proto) as object | null;
  }
}

// matchMedia, used by next-themes.
if (typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
