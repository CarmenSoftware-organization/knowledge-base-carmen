export type SupabaseCheckErrorKind = "env" | "network" | "http" | "parse";

/** Typed failure for the Supabase connectivity test. */
export class SupabaseCheckError extends Error {
  readonly kind: SupabaseCheckErrorKind;
  readonly status?: number;

  constructor(message: string, kind: SupabaseCheckErrorKind, status?: number) {
    super(message);
    this.name = "SupabaseCheckError";
    this.kind = kind;
    this.status = status;
  }
}

/**
 * Calls the Supabase count-only RPC directly from the browser and returns the
 * number of rows in public.chat_history. Env is read at call time (not module
 * load) so the function stays unit-testable.
 */
export async function fetchChatHistoryCount(): Promise<number> {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new SupabaseCheckError(
      "ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY",
      "env",
    );
  }

  const endpoint = `${url.replace(/\/+$/, "")}/rest/v1/rpc/get_chat_history_count`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
  } catch {
    throw new SupabaseCheckError("เชื่อมต่อ Supabase ไม่ได้ (network)", "network");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SupabaseCheckError(
      `Supabase ตอบกลับ HTTP ${res.status}${body ? `: ${body}` : ""}`,
      "http",
      res.status,
    );
  }

  const raw = await res.text();
  let value: number;
  try {
    value = Number(JSON.parse(raw));
  } catch {
    throw new SupabaseCheckError("รูปแบบผลลัพธ์จาก Supabase ไม่ถูกต้อง", "parse");
  }
  if (!Number.isFinite(value)) {
    throw new SupabaseCheckError("รูปแบบผลลัพธ์จาก Supabase ไม่ถูกต้อง", "parse");
  }
  return value;
}
