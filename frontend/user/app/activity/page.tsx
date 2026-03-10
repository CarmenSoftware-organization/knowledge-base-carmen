import { getActivityLogs } from "@/lib/wiki-api";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
import { ActivityControls } from "@/components/activity/activity-controls";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Activity Logs</h1>
          <p className="text-muted-foreground">
            ประวัติการใช้งานและค้นหาข้อมูลภายในระบบ (หน่วยธุรกิจ: {buCookie})
          </p>
        </div>
        <ActivityControls bu={buCookie} />
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[180px]">วันเวลา</TableHead>
                <TableHead className="w-[150px]">ผู้ดำเนินการ</TableHead>
                <TableHead className="w-[180px]">กิจกรรม (Action)</TableHead>
                <TableHead>รายละเอียด (Details)</TableHead>
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
                logs.map((log) => {
                  // Format details for display
                  let detailsText = "-";
                  if (typeof log.details === 'object' && log.details !== null) {
                    const d = log.details as any;
                    const parts = [];
                    
                    // Show Method/Status Badge-like style
                    if (d.status) parts.push(`[${d.status}]`);
                    
                    // Show Path or Title
                    if (d.path) parts.push(d.path);
                    if (d.title && !d.path) parts.push(d.title);
                    
                    // Show Search Query
                    if (d.query) parts.push(`คำค้นหา: "${d.query}"`);
                    
                    // Show Results/Sources Count
                    if (d.results !== undefined) parts.push(`(${d.results} ผลลัพธ์)`);
                    if (d.sources !== undefined) parts.push(`(${d.sources} แหล่งอ้างอิง)`);
                    
                    // Show Specific Files for GitHub
                    if (Array.isArray(d.files)) {
                      if (d.files.length > 0) {
                        parts.push(`ไฟล์: ${d.files.join(", ")}`);
                      }
                    } else if (d.files !== undefined) {
                      parts.push(`(${d.files} ไฟล์)`);
                    }

                    if (d.repo) parts.push(`ที่เก็บ: ${d.repo}`);
                    
                    detailsText = parts.length > 0 ? parts.join(" ") : JSON.stringify(d);
                  } else {
                    detailsText = log.details || "-";
                  }

                  // Friendly Actor Name
                  const actor = log.user_id === "system" ? "ระบบ (System)" : (log.user_id || "ไม่ระบุ");

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm:ss", { locale: th })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          <span className="font-medium text-sm">{actor}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10 uppercase">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[450px]">
                        <div className="text-sm leading-relaxed" title={detailsText}>
                           {detailsText}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
