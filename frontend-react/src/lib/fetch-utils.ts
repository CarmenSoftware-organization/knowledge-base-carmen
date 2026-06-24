/**
 * fetch with a hard timeout. A backend on a free tier can spin down and take
 * 30-60s+ to cold-start; without a timeout a route loader's fetch stays pending
 * forever and the whole SPA renders blank. Abort after `timeoutMs` so the loader
 * fails fast and the page can render a graceful (empty/error) state instead.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 12000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
