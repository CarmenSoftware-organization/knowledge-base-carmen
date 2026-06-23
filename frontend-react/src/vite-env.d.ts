/// <reference types="vite/client" />

// Allow side-effect CSS imports from @fontsource/* packages (no bundled type defs)
declare module "@fontsource/geist-sans";
declare module "@fontsource/geist-mono";

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_USE_REMOTE_API?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
