import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DEFAULT_BU } from "@/lib/config";
import { adminApiJson } from "@/lib/admin-fetch";
import { OutputLog } from "@/components/admin/output-log";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useBusinessUnits } from "@/hooks/use-business-units";

type Scope = "index-bu" | "index-all" | "chat-logs";

export function ResetPanel() {
  const bus = useBusinessUnits();
  const [scope, setScope] = useState<Scope>("index-bu");
  const [bu, setBu] = useState(DEFAULT_BU);
  const [confirmText, setConfirmText] = useState("");
  const { entries, busy, run } = useAdminAction();

  const spec = useMemo(() => {
    if (scope === "index-bu") {
      return {
        token: bu,
        warn: `ลบ RAG index (documents + chunks) ของ BU "${bu}" ทั้งหมด — ต้องสั่ง Reindex ใหม่หลังทำ. ไม่กระทบประวัติแชท`,
        request: () =>
          adminApiJson(`/api/index/reset?bu=${encodeURIComponent(bu)}`, {
            method: "POST",
            body: JSON.stringify({ confirm: bu }),
          }),
      };
    }
    if (scope === "index-all") {
      return {
        token: "ALL",
        warn: "ลบ RAG index ของ ทุก BU — ต้องสั่ง Reindex ใหม่ทั้งหมด. ไม่กระทบประวัติแชท",
        request: () =>
          adminApiJson(`/api/index/reset?bu=all`, {
            method: "POST",
            body: JSON.stringify({ confirm: "ALL" }),
          }),
      };
    }
    return {
      token: "RESET-CHAT-LOGS",
      warn: "ลบ ประวัติแชท + activity log ของ ทุก BU. ไม่กระทบ RAG index / เอกสาร",
      request: () =>
        adminApiJson(`/api/system/reset`, {
          method: "POST",
          body: JSON.stringify({ confirm: "RESET-CHAT-LOGS" }),
        }),
    };
  }, [scope, bu]);

  const armed = confirmText.trim() === spec.token && !busy;

  async function doReset() {
    try {
      await run(`reset ${scope}`, () => spec.request().then((r) => r.data));
    } catch {
      /* error already logged by useAdminAction */
    }
    setConfirmText("");
  }

  const options = bus.length ? bus.map((b) => b.slug) : [DEFAULT_BU];

  return (
    <Card className="border-red-500/40 p-5">
      <h2 className="mb-1 text-lg font-semibold text-red-600 dark:text-red-400">Reset (อันตราย)</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        การ reset ลบข้อมูลถาวรและย้อนกลับไม่ได้ — อ่านคำเตือนของแต่ละแบบให้ดีก่อนทำ
      </p>

      <RadioGroup
        value={scope}
        onValueChange={(v) => {
          setScope(v as Scope);
          setConfirmText("");
        }}
        className="mb-4 space-y-2"
      >
        <label className="flex items-start gap-2">
          <RadioGroupItem value="index-bu" id="s-bu" className="mt-1" />
          <span>
            <span className="font-medium">Reset RAG index — BU เดียว</span>
            <br />
            <span className="text-xs text-muted-foreground">ลบ index ของ BU ที่เลือก · ต้อง reindex ใหม่</span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <RadioGroupItem value="index-all" id="s-all" className="mt-1" />
          <span>
            <span className="font-medium">Reset RAG index — ทุก BU</span>
            <br />
            <span className="text-xs text-muted-foreground">ลบ index ของทุก BU · ต้อง reindex ใหม่ทั้งหมด</span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <RadioGroupItem value="chat-logs" id="s-chat" className="mt-1" />
          <span>
            <span className="font-medium">Reset ประวัติแชท + activity log</span>
            <br />
            <span className="text-xs text-muted-foreground">ลบแชท/ล็อกของทุก BU · ไม่กระทบ index</span>
          </span>
        </label>
      </RadioGroup>

      {scope === "index-bu" && (
        <div className="mb-4 space-y-1">
          <Label>Business Unit</Label>
          <Select
            value={bu}
            onValueChange={(v) => {
              setBu(v);
              setConfirmText("");
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">
        ⚠️ {spec.warn}
      </div>

      <div className="mb-4 space-y-1">
        <Label htmlFor="reset-confirm">
          พิมพ์ <code className="rounded bg-muted px-1">{spec.token}</code> เพื่อยืนยัน
        </Label>
        <Input
          id="reset-confirm"
          className="w-72"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={spec.token}
          autoComplete="off"
        />
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={!armed}>
            Run reset
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการ reset?</AlertDialogTitle>
            <AlertDialogDescription>{spec.warn} — ย้อนกลับไม่ได้</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={doReset} className="bg-red-600 hover:bg-red-700">
              ยืนยัน reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-4">
        <OutputLog entries={entries} />
      </div>
    </Card>
  );
}
