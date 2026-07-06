import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { adminApiJson } from "@/lib/admin-fetch";
import type { Meta } from "@/lib/fetch-utils";

type ActivityLog = {
  id: string;
  user_id: string;
  action: string;
  category: string;
  timestamp: string;
};

export function ActivityPanel() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    adminApiJson<ActivityLog[]>("/api/activity/list?bu=carmen&limit=50&offset=0&source=all")
      .then(({ data, meta }: { data: ActivityLog[]; meta?: Meta }) => {
        if (alive) {
          setLogs(data ?? []);
          setTotal(meta?.total ?? 0);
        }
      })
      .catch(() => {
        if (alive) {
          setLogs([]);
          setTotal(0);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-lg font-semibold">Activity Log</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        ประวัติการซิงค์ Wiki, Re-indexing และกิจกรรมระบบ (BU carmen) — รวม {total} รายการแรก
      </p>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีกิจกรรมที่บันทึกไว้</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
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
                <tr key={log.id} className="border-t border-border/60 hover:bg-muted/40">
                  <td className="px-3 py-2 align-top whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString("th-TH")}
                  </td>
                  <td className="px-3 py-2 align-top font-medium">{log.action}</td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">{log.category || "system"}</td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">{log.user_id || "system"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
