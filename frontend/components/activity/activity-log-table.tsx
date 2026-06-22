"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ActivityLog, getActivityLogs } from "@/lib/wiki-api";

const PAGE_SIZE = 20;

type SourceFilter = "all" | "user" | "admin";

const ADMIN_ACTIONS = [
  "ซิงค์ Wiki (จาก GitHub)",
  "เริ่มดึงข้อมูล ( Re-indexing )",
  "ดึงข้อมูลไม่สำเร็จ",
  "ดึงข้อมูลถูกขัดจังหวะ",
  "เสร็จสิ้นดึงข้อมูล",
  "สร้างไฟล์วิกิใหม่",
  "อัปเดตไฟล์วิกิ",
  "ลบไฟล์วิกิ",
];

function isAdminLog(log: ActivityLog): boolean {
  return (
    log.user_id === "system" || ADMIN_ACTIONS.includes(log.action)
  );
}

interface Props {
  bu: string;
}

export function ActivityLogTable({ bu }: Props) {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getActivityLogs(bu, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE, sourceFilter)
      .then((data) => {
        setLogs(data.items || []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [bu, currentPage, sourceFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handleFilterChange = (v: SourceFilter) => {
    setSourceFilter(v);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4 flex flex-col items-center">
      <div className="flex items-center justify-center gap-3">
        <span className="text-sm text-muted-foreground">Roles</span>
        <Select
          value={sourceFilter}
          onValueChange={(v) => handleFilterChange(v as SourceFilter)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="user">Log ผู้ใช้</SelectItem>
            <SelectItem value="admin">Log แอดมิน/ระบบ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden mx-auto max-w-4xl w-full">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[100px] text-center">ผู้ดำเนินการ</TableHead>
                <TableHead className="w-[180px] text-center">วันเวลา</TableHead>
                <TableHead className="w-[180px] text-center">กิจกรรม</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32">
                    <div className="flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    ไม่พบข้อมูล
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const isAdmin = isAdminLog(log);
                  const dateStr = log.created_at || (log as ActivityLog & { timestamp?: string }).timestamp;
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${
                            isAdmin
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {isAdmin ? "แอดมิน/ระบบ" : "ผู้ใช้"}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground text-center">
                        {dateStr
                          ? format(new Date(dateStr), "dd MMM yyyy HH:mm:ss", {
                              locale: th,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10 uppercase">
                          {log.action}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between px-2 py-3 w-full max-w-4xl">
          <p className="text-sm text-muted-foreground">
            แสดง {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
            {Math.min(currentPage * PAGE_SIZE, total)} จาก {total} แถว
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              ก่อนหน้า
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              หน้า {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              ถัดไป
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
