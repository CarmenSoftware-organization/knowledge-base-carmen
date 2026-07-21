import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
import { adminApiJson } from "@/lib/admin-fetch";
import { OutputLog } from "@/components/admin/output-log";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useBusinessUnits, type BusinessUnit } from "@/hooks/use-business-units";

export function BusinessUnitsPanel() {
  const bus = useBusinessUnits();
  const { entries, busy, run } = useAdminAction();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [deprovSlug, setDeprovSlug] = useState("");

  const deprovValid = !!deprovSlug.trim() && bus.some((b) => b.slug === deprovSlug.trim());

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Business Units</h2>

      <Button
        variant="secondary"
        className="mb-4"
        disabled={busy}
        onClick={() =>
          run("list BUs", () => adminApiJson<BusinessUnit[]>("/api/business-units").then((r) => r.data))
        }
      >
        List business units
      </Button>

      <div className="mb-5 rounded-md border p-4">
        <h3 className="mb-3 text-sm font-medium">Provision</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my_bu" />
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
        <Button
          className="mt-3"
          disabled={busy || !slug.trim()}
          onClick={() =>
            run(`provision ${slug.trim()}`, () =>
              adminApiJson("/api/business-units/provision", {
                method: "POST",
                body: JSON.stringify({ slug: slug.trim(), name: name.trim(), description: desc.trim() }),
              }).then((r) => r.data),
            )
          }
        >
          Provision
        </Button>
      </div>

      <div className="mb-4 rounded-md border border-red-500/40 p-4">
        <h3 className="mb-1 text-sm font-medium text-red-600 dark:text-red-400">
          Deprovision (ลบ BU + ข้อมูลทั้งหมดแบบ cascade)
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          พิมพ์ slug ให้ตรงกับ BU ที่มีอยู่ ปุ่มจะเปิดใช้งานเมื่อ slug ตรงเท่านั้น
        </p>
        <div className="space-y-1">
          <Label>Slug ที่จะลบ</Label>
          <Input
            className="w-60"
            value={deprovSlug}
            onChange={(e) => setDeprovSlug(e.target.value)}
            placeholder="เช่น carmen"
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-3" disabled={busy || !deprovValid}>
              Deprovision
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ลบ BU &quot;{deprovSlug}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                เอกสาร / แชท / FAQ ของ BU นี้จะถูกลบแบบ cascade — ย้อนกลับไม่ได้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() =>
                  run(`deprovision ${deprovSlug.trim()}`, () =>
                    adminApiJson("/api/business-units/deprovision", {
                      method: "POST",
                      body: JSON.stringify({ slug: deprovSlug.trim() }),
                    }).then((r) => r.data),
                  )
                }
              >
                ยืนยันลบ
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <OutputLog entries={entries} />
    </Card>
  );
}
