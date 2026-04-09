"use client";

import { useEffect, useState } from "react";
import { 
  getBusinessUnits, 
  getSelectedBUClient, 
  setSelectedBU, 
  type BusinessUnit 
} from "@/lib/wiki-api";
import { DEFAULT_BU } from "@/lib/config";
import { usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function BUSwitcher() {
  const [bus, setBus] = useState<BusinessUnit[]>([]);
  const [selected, setSelected] = useState<string>(DEFAULT_BU);
  const pathname = usePathname();

  useEffect(() => {
    async function load() {
      try {
        const data = await getBusinessUnits();
        setBus(data.items);
        setSelected(getSelectedBUClient());
      } catch {
        // BU list unavailable — show empty selector
      }
    }
    load();
  }, []);

  const handleChange = (val: string) => {
    setSelected(val);
    setSelectedBU(val);
    // If user is inside an article path, go to that category in new BU to avoid 404.
    const match = pathname.match(/^\/categories\/([^/]+)\/[^/]+$/);
    if (match?.[1]) {
      window.location.assign(`/categories/${match[1]}`);
      return;
    }
    // Refresh current page for all other routes.
    window.location.reload();
  };

  if (bus.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger className="h-9 px-3 w-[160px] bg-muted/50 border-none rounded-xl focus:ring-0">
          <SelectValue placeholder="เลือกหน่วยงาน" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-200">
          {bus.map((bu) => (
            <SelectItem key={bu.id} value={bu.slug} className="rounded-lg">
              {bu.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
