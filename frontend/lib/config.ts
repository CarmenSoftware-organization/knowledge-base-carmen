const fallbackApiBase = "http://localhost:8080";

const envApiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
const useRemoteApiInDev = process.env.NEXT_PUBLIC_USE_REMOTE_API === "true";
const isProduction = process.env.NODE_ENV === "production";
const isInvalidProdLocalhost =
  process.env.NODE_ENV === "production" &&
  !!envApiBase &&
  /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
    envApiBase.replace(/\/+$/, ""),
  );

const isDevRemoteApi =
  process.env.NODE_ENV !== "production" &&
  !!envApiBase &&
  /^https?:\/\//i.test(envApiBase) &&
  !/^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
    envApiBase.replace(/\/+$/, ""),
  );

const raw =
  isProduction
    ? isInvalidProdLocalhost
      ? fallbackApiBase
      : envApiBase || fallbackApiBase
    : isDevRemoteApi && !useRemoteApiInDev
      ? fallbackApiBase
      : envApiBase || fallbackApiBase;

if (isProduction && !envApiBase) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE is required in production build (set as Docker build arg).",
  );
}
/** No trailing slash — avoids `//api/...` when building URLs */
export const API_BASE = raw.replace(/\/+$/, "");
export const DEFAULT_BU = "carmen";
