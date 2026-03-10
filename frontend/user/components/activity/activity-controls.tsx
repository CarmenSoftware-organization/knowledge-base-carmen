"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database, Loader2 } from "lucide-react";
import { syncWiki, rebuildIndex } from "@/lib/wiki-api";
import { toast } from "sonner";

interface ActivityControlsProps {
  bu: string;
}

export function ActivityControls({ bu }: ActivityControlsProps) {
  const [syncing, setSyncing] = useState(false);
  const [indexing, setIndexing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncWiki();
      toast.success("Sync สำเร็จ", { description: res.message });
      // Reload page to see new logs possibly
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error("Sync ล้มเหลว", { description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleReindex = async () => {
    setIndexing(true);
    try {
      const res = await rebuildIndex(bu);
      toast.success("เริ่ม Reindex แล้ว", { description: res.message });
    } catch (err: any) {
      toast.error("Reindex ล้มเหลว", { description: err.message });
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="flex gap-3 mb-6">
      <Button 
        variant="outline" 
        onClick={handleSync} 
        disabled={syncing || indexing}
        className="flex items-center gap-2"
      >
        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sync จาก GitHub
      </Button>
      <Button 
        variant="outline" 
        onClick={handleReindex} 
        disabled={syncing || indexing}
        className="flex items-center gap-2"
      >
        {indexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
        Reindex ข้อมูล (AI Search)
      </Button>
    </div>
  );
}
