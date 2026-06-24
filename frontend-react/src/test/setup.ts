import { expect } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";

// Register a DOM before any test imports a component.
GlobalRegistrator.register();

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
