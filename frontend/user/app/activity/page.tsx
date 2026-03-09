import { getActivityLogs } from "@/lib/wiki-api";
import { cookies } from "next/headers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function ActivityPage() {
  const c = await cookies();
  const buCookie = c.get("selected_bu")?.value || "carmen";
  
  let logs: any[] = [];
  try {
    const data = await getActivityLogs(buCookie, 100);
    logs = data.items || [];
  } catch (err) {
    console.error("Failed to load activity logs:", err);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Activity Logs</h1>
        <p className="text-muted-foreground">
          ประวัติการใช้งานและค้นหาข้อมูลภายในระบบ (หมวดหมู่: {buCookie})
        </p>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[180px]">วันเวลา</TableHead>
                <TableHead className="w-[140px]">กิจกรรม (Action)</TableHead>
                <TableHead>รายละเอียด (Details)</TableHead>
                <TableHead className="w-[140px]">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    ไม่พบข้อมูลประวัติการใช้งาน
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(log.created_at), "dd MMM yyyy HH:mm:ss", { locale: th })}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium ring-1 ring-inset ring-secondary-foreground/10">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate" title={log.details || ""}>
                      {log.details || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.ip_address || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
