const raw =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://localhost:8080";
/** No trailing slash — avoids `//api/...` when building URLs */
export const API_BASE = raw.replace(/\/+$/, "");
export const DEFAULT_BU = "carmen";
