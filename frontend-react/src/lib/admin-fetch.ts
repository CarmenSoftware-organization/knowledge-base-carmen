import { API_BASE } from "@/lib/config";
import { apiJson, ApiError, type Meta } from "@/lib/fetch-utils";
import { getAdminKey, clearAdminKey } from "@/lib/admin-auth";

/**
 * apiJson variant for admin-guarded endpoints: prepends API_BASE, attaches the
 * session admin key as X-Admin-Key, and JSON content-type. On 401 it clears the
 * stored key (which re-locks the console) then rethrows the ApiError.
 */
export async function adminApiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; meta?: Meta }> {
  const key = getAdminKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (key) headers["X-Admin-Key"] = key;

  try {
    return await apiJson<T>(`${API_BASE}${path}`, { ...init, headers });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearAdminKey();
    }
    throw err;
  }
}
