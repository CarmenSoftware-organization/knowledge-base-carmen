const fallbackApiBase =
  process.env.NODE_ENV === "production"
    ? "https://new-carmen.onrender.com"
    : "http://localhost:8080";

const raw = process.env.NEXT_PUBLIC_API_BASE?.trim() || fallbackApiBase;
/** No trailing slash — avoids `//api/...` when building URLs */
export const API_BASE = raw.replace(/\/+$/, "");
export const DEFAULT_BU = "carmen";
