"use client";

import { useEffect, useState } from "react";
import {
  getBusinessUnits,
  getSelectedBUClient,
  setSelectedBU,
  type BusinessUnit,
} from "@/lib/wiki-api";
import { DEFAULT_BU } from "@/lib/config";
import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type BUSwitcherProps = {
  className?: string;
  /** Full-width row for mobile drawer / tight layouts */
  fluid?: boolean;
  /** Desktop toolbar: compact trigger (h-8) */
  toolbar?: boolean;
};

export function BUSwitcher({ className, fluid, toolbar }: BUSwitcherProps) {
  const t = useTranslations("common");
  const router = useRouter();
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
    // Client nav after BU cookie (avoid full reload); from article → category index
    const match = pathname.match(/^\/categories\/([^/]+)\/.+/);
    if (match?.[1]) {
      router.push(`/categories/${match[1]}`);
      return;
    }
    router.refresh();
  };

  if (bus.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center",
        toolbar
          ? "min-w-0 gap-1.5 border-0 bg-transparent p-0 shadow-none"
          : "gap-2 rounded-xl border border-primary/35 bg-primary/10 px-2 py-1 shadow-sm dark:border-primary/45 dark:bg-primary/15",
        fluid && "w-full min-w-0 flex-wrap sm:flex-nowrap",
        className,
      )}
      title={t("buSwitcherHint")}
    >
      <div
        className={cn(
          "flex min-w-0 shrink-0 items-center gap-1",
          toolbar ? "text-muted-foreground" : "text-primary",
        )}
      >
        <Building2 className="size-4 shrink-0" aria-hidden />
        {!toolbar && (
          <span className="hidden min-[1200px]:inline text-[11px] font-bold uppercase tracking-wide text-primary">
            {t("buSwitcherLabel")}
          </span>
        )}
      </div>
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger
          size={toolbar ? "default" : "sm"}
          aria-label={t("buSwitcherLabel")}
          className={cn(
            "font-semibold text-foreground ring-0 focus:ring-2 focus:ring-primary/35 [&>span]:truncate",
            toolbar
              ? "min-w-[7rem] max-w-[12rem] shrink-0 rounded-full border border-input bg-background px-3 text-[13px] leading-tight shadow-none transition-colors duration-150 hover:bg-accent hover:text-white dark:hover:bg-accent dark:hover:text-foreground"
              : "rounded-lg border border-primary/25 bg-background/95 px-2 text-sm shadow-sm hover:bg-background dark:border-primary/35 dark:bg-background/90",
            fluid
              ? "min-w-0 w-full max-w-none flex-1 basis-[12rem]"
              : !toolbar &&
                  "min-w-[4.75rem] w-[min(7.25rem,28vw)] max-w-[7.5rem]",
          )}
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
