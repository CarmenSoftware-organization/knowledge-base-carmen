import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_BU } from "@/lib/config";
import { adminApiJson } from "@/lib/admin-fetch";
import { OutputLog } from "@/components/admin/output-log";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useBusinessUnits } from "@/hooks/use-business-units";

export function IndexingPanel() {
  const bus = useBusinessUnits();
  const [bu, setBu] = useState(DEFAULT_BU);
  const [path, setPath] = useState("");
  const { entries, busy, run } = useAdminAction();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [polling, setPolling] = useState(false);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  }

  async function rebuild() {
    await run(`rebuild ${bu}`, () =>
      adminApiJson(`/api/index/rebuild?bu=${encodeURIComponent(bu)}`, { method: "POST" }).then((r) => r.data),
    );
    stopPolling();
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await adminApiJson<{ running: boolean; running_for_sec?: number }>(
          `/api/index/rebuild/status?bu=${encodeURIComponent(bu)}`,
        );
        if (!data.running) {
          stopPolling();
          await run(`status ${bu}`, async () => data);
        }
      } catch {
        stopPolling();
      }
    }, 3000);
  }

  const options = bus.length ? bus.map((b) => b.slug) : [DEFAULT_BU];

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold">Indexing / Reindex</h2>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Business Unit</Label>
          <Select value={bu} onValueChange={setBu}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((slug) => (
                <SelectItem key={slug} value={slug}>
                  {slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={rebuild} disabled={busy || polling}>
          Rebuild
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            run(`status ${bu}`, () =>
              adminApiJson(`/api/index/rebuild/status?bu=${encodeURIComponent(bu)}`).then((r) => r.data),
            )
          }
        >
          Check Status
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            run(`unlock ${bu}`, () =>
              adminApiJson(`/api/index/rebuild/unlock?bu=${encodeURIComponent(bu)}`, { method: "POST" }).then(
                (r) => r.data,
              ),
            )
          }
        >
          Force Unlock
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Rebuild one file (path)</Label>
          <Input
            className="w-72"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="wiki/....md"
          />
        </div>
        <Button
          variant="secondary"
          disabled={busy || !path.trim()}
          onClick={() =>
            run(`rebuild one ${path.trim()}`, () =>
              adminApiJson(
                `/api/index/rebuild/one?bu=${encodeURIComponent(bu)}&path=${encodeURIComponent(path.trim())}`,
                { method: "POST" },
              ).then((r) => r.data),
            )
          }
        >
          Rebuild One
        </Button>
      </div>

      {polling && (
        <p className="mb-3 text-sm text-muted-foreground">กำลัง reindex… (poll สถานะทุก 3 วินาที)</p>
      )}
      <OutputLog entries={entries} />
    </Card>
  );
}
