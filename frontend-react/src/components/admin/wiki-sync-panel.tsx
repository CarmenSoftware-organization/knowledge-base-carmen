import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { adminApiJson } from "@/lib/admin-fetch";
import { OutputLog } from "@/components/admin/output-log";
import { useAdminAction } from "@/hooks/use-admin-action";

export function WikiSyncPanel() {
  const { entries, busy, run } = useAdminAction();
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Wiki Sync</h2>
      <div className="mb-4 flex flex-wrap gap-3">
        <Button
          disabled={busy}
          onClick={() =>
            run("wiki sync", () => adminApiJson("/api/wiki/sync", { method: "POST" }).then((r) => r.data))
          }
        >
          Sync now
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => run("wiki sync audit", () => adminApiJson("/api/wiki/sync/audit").then((r) => r.data))}
        >
          View Audit
        </Button>
      </div>
      <OutputLog entries={entries} />
    </Card>
  );
}
