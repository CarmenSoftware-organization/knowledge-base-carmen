"use client";

import { useEffect, useState } from "react";
import {
  getBusinessUnits,
  getSelectedBUClient,
  setSelectedBU,
  type BusinessUnit,
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
import { useTranslations } from "next-intl";

export function BUSwitcher() {
  const t = useTranslations("common");
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
    <div
      className="flex items-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-2 py-1 shadow-sm dark:border-primary/45 dark:bg-primary/15"
      title={t("buSwitcherHint")}
    >
      <div className="flex items-center gap-1.5 text-primary shrink-0">
        <Building2 className="size-4" aria-hidden />
        <span className="hidden min-[1200px]:inline text-[11px] font-bold uppercase tracking-wide text-primary">
          {t("buSwitcherLabel")}
        </span>
      </div>
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger
          aria-label={t("buSwitcherLabel")}
          className="h-8 min-w-[7.5rem] w-[min(11rem,38vw)] rounded-lg border border-primary/25 bg-background/95 px-2.5 text-sm font-semibold text-foreground shadow-sm ring-0 hover:bg-background focus:ring-2 focus:ring-primary/35 dark:border-primary/35 dark:bg-background/90"
        >
          <SelectValue placeholder={t("buSwitcherPlaceholder")} />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {bus.map((bu) => (
            <SelectItem key={bu.id} value={bu.slug} className="rounded-lg font-medium">
              {bu.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
