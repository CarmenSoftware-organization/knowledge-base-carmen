import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { setAdminKey, clearAdminKey } from "@/lib/admin-auth";
import { adminApiJson } from "@/lib/admin-fetch";
import { ApiError } from "@/lib/fetch-utils";

export function AdminGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const key = value.trim();
    if (!key) return;
    setBusy(true);
    setError(null);
    setAdminKey(key); // temporarily store so adminApiJson attaches it
    try {
      // Validate with a harmless admin-guarded GET (no side effects).
      await adminApiJson("/api/index/rebuild/status?bu=carmen");
      onUnlocked();
    } catch (err) {
      clearAdminKey();
      if (err instanceof ApiError && err.status === 401) {
        setError("Admin key ไม่ถูกต้อง");
      } else {
        setError("เชื่อมต่อ backend ไม่ได้ ลองใหม่อีกครั้ง");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm items-center px-4">
      <Card className="w-full p-6">
        <h1 className="mb-1 text-lg font-semibold">Admin Console</h1>
        <p className="mb-4 text-sm text-muted-foreground">กรอก admin key เพื่อเข้าใช้งาน</p>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="admin-key">Admin key</Label>
            <Input
              id="admin-key"
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={busy}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !value.trim()}>
            <span>{busy ? "กำลังตรวจสอบ…" : "Unlock"}</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}
