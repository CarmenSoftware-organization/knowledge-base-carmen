import { useLoaderData } from "react-router-dom";
import type { LoaderFunction } from "react-router-dom";
import { API_BASE, DEFAULT_BU } from "@/lib/config";

type ActivityLog = {
  id: number;
  user_id: string;
  action: string;
  category: string;
  timestamp: string;
  details?: unknown;
};

type ActivityResponse = {
  items: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
};

export const adminActivityLoader: LoaderFunction = async () => {
  try {
    const res = await fetch(
      `${API_BASE}/api/activity/list?bu=${DEFAULT_BU}&limit=50&offset=0&source=all`,
      {
        headers: { "Cache-Control": "no-cache" },
      },
    );
    if (!res.ok) {
      return { items: [], total: 0, limit: 50, offset: 0 } satisfies ActivityResponse;
    }
    const data: ActivityResponse = await res.json();
    return data;
  } catch {
    return { items: [], total: 0, limit: 50, offset: 0 } satisfies ActivityResponse;
  }
};

export default function AdminActivity() {
  const { items: logs, total } = useLoaderData() as ActivityResponse;

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">
              Admin Activity Log
            </h1>
            <p className="text-sm text-muted-foreground">
              ดูประวัติการซิงค์ Wiki, Re-indexing, และกิจกรรมระบบสำหรับ BU {DEFAULT_BU}.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            รวมทั้งสิ้น {total} รายการแรก
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            ยังไม่มีกิจกรรมที่บันทึกไว้
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">เวลา</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                  <th className="px-3 py-2 text-left font-medium">หมวด</th>
                  <th className="px-3 py-2 text-left font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-border/60 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2 align-top whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString("th-TH")}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">{log.action}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {log.category || "system"}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {log.user_id || "system"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
