import { cn } from "@/lib/utils";

export type LogEntry = { ts: string; ok: boolean; title: string; body?: unknown };

export function OutputLog({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        ยังไม่มีผลลัพธ์ — กดปุ่มด้านบนเพื่อรันคำสั่ง
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div
          key={i}
          className={cn(
            "rounded-md border p-3 text-sm",
            e.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5",
          )}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-medium">{e.title}</span>
            <span className="text-xs text-muted-foreground">{e.ts}</span>
          </div>
          {e.body != null && (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {typeof e.body === "string" ? e.body : JSON.stringify(e.body, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
