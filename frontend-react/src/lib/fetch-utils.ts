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

export type Meta = { total?: number; limit?: number; offset?: number };

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

type Envelope<T> = {
  success?: boolean;
  data?: T;
  meta?: Meta;
  error?: { code?: string; message?: string };
};

/**
 * Fetch JSON and unwrap the standard response envelope { success, data, meta }.
 * Throws ApiError on { success:false }. Tolerant during rollout: if the body is
 * not enveloped (legacy flat shape), returns it unchanged as `data`.
 */
export async function apiJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 12000,
): Promise<{ data: T; meta?: Meta }> {
  const res = await fetchWithTimeout(input, init, timeoutMs);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const env = body as Envelope<T> | null;
  if (env && typeof env.success === "boolean") {
    if (!env.success) {
      throw new ApiError(
        env.error?.code ?? "UNKNOWN",
        env.error?.message ?? `HTTP ${res.status}`,
        res.status,
      );
    }
    return { data: env.data as T, meta: env.meta };
  }
  // legacy / non-enveloped fallback (pre-rollout backend) — remove after rollout
  if (!res.ok) {
    throw new ApiError("HTTP_ERROR", `HTTP ${res.status}`, res.status);
  }
  return { data: body as T };
}
