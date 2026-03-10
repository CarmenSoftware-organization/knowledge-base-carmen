"use client";

import { useEffect, useState } from "react";
import { 
  getBusinessUnits, 
  getSelectedBUClient, 
  setSelectedBU, 
  type BusinessUnit 
} from "@/lib/wiki-api";
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
  const [selected, setSelected] = useState<string>("carmen");

  useEffect(() => {
    async function load() {
      try {
        const data = await getBusinessUnits();
        setBus(data.items);
        setSelected(getSelectedBUClient());
      } catch (e) {
        console.error("Failed to load BUs", e);
      }
    }
    load();
  }, []);

  const handleChange = (val: string) => {
    setSelected(val);
    setSelectedBU(val);
    // Refresh the page to update all data with new BU context
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
