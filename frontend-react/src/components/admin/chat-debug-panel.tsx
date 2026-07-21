import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { adminApiJson } from "@/lib/admin-fetch";
import { OutputLog } from "@/components/admin/output-log";
import { useAdminAction } from "@/hooks/use-admin-action";

export function ChatDebugPanel() {
  const { entries, busy, run } = useAdminAction();
  const [q, setQ] = useState("");

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Chat Debug</h2>
      <div className="mb-3 space-y-1">
        <Label>Query</Label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์คำถามเพื่อทดสอบ routing" />
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Button
          disabled={busy || !q.trim()}
          onClick={() =>
            run("route-test", () =>
              adminApiJson("/api/chat/route-test", {
                method: "POST",
                body: JSON.stringify({ message: q.trim() }),
              }).then((r) => r.data),
            )
          }
        >
          Route Test
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !q.trim()}
          onClick={() =>
            run("intent-test", () =>
              adminApiJson("/api/chat/intent-test", {
                method: "POST",
                body: JSON.stringify({ message: q.trim() }),
              }).then((r) => r.data),
            )
          }
        >
          Intent Test
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            run("history list", () =>
              adminApiJson("/api/chat/history/list?bu=carmen&limit=20").then((r) => r.data),
            )
          }
        >
          History list
        </Button>
      </div>
      <OutputLog entries={entries} />
    </Card>
  );
}
