import { useCallback, useState } from "react";
import { ApiError } from "@/lib/fetch-utils";
import type { LogEntry } from "@/components/admin/output-log";

/**
 * Runs an admin action, capturing its result (or error) into a capped, newest-
 * first log the panels render via <OutputLog>. `run` rethrows so callers can
 * chain follow-ups (e.g. status polling) but the log entry is recorded either way.
 */
export function useAdminAction() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (title: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    const ts = new Date().toLocaleTimeString("th-TH");
    try {
      const data = await fn();
      setEntries((prev) => [{ ts, ok: true, title, body: data }, ...prev].slice(0, 20));
      return data;
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? `[${e.status} ${e.code}] ${e.message}`
          : e instanceof Error
            ? e.message
            : String(e);
      setEntries((prev) => [{ ts, ok: false, title, body: msg }, ...prev].slice(0, 20));
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  return { entries, busy, run };
}
