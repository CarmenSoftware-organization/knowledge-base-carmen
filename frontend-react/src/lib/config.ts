const fallbackApiBase = "http://localhost:8080";

const envApiBase = import.meta.env.VITE_API_BASE?.trim();
const useRemoteApiInDev = import.meta.env.VITE_USE_REMOTE_API === "true";
const isProduction = import.meta.env.PROD;

const localhostRe = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i;

const isInvalidProdLocalhost =
  isProduction &&
  !!envApiBase &&
  localhostRe.test(envApiBase.replace(/\/+$/, ""));

const isDevRemoteApi =
  !isProduction &&
  !!envApiBase &&
  /^https?:\/\//i.test(envApiBase) &&
  !localhostRe.test(envApiBase.replace(/\/+$/, ""));

const raw = isProduction
  ? isInvalidProdLocalhost
    ? fallbackApiBase
    : envApiBase || fallbackApiBase
  : isDevRemoteApi && !useRemoteApiInDev
    ? fallbackApiBase
    : envApiBase || fallbackApiBase;

if (isProduction && !envApiBase) {
  throw new Error(
    "VITE_API_BASE is required in production build (set as Docker build arg).",
  );
}

/** No trailing slash — avoids `//api/...` when building URLs */
export const API_BASE = raw.replace(/\/+$/, "");
export const DEFAULT_BU = "carmen";
