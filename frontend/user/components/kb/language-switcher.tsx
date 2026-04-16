"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocaleCookie } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const handleSwitch = (newLocale: string) => {
    if (newLocale === locale) return;
    setLocaleCookie(newLocale);
    router.refresh();
  };

  const segmentClass = (active: boolean) =>
    cn(
      "h-8 rounded-md px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold transition-all",
      active
        ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/40"
        : "text-muted-foreground hover:bg-background/90 hover:text-foreground dark:hover:bg-background/50"
    );

  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-2 py-1 shadow-sm dark:border-primary/45 dark:bg-primary/15"
      title={t("languageHint")}
    >
      <div className="hidden sm:flex items-center gap-1 text-primary shrink-0">
        <Languages className="size-4" aria-hidden />
        <span className="hidden md:inline text-[11px] font-bold uppercase tracking-wide text-primary">
          {t("languageLabel")}
        </span>
      </div>
      <div
        role="group"
        aria-label={t("languageLabel")}
        className="flex items-center gap-0.5 rounded-lg bg-background/70 p-0.5 ring-1 ring-primary/20 dark:bg-background/50 dark:ring-primary/30"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={segmentClass(locale === "th")}
          onClick={() => handleSwitch("th")}
        >
          ไทย
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={segmentClass(locale === "en")}
          onClick={() => handleSwitch("en")}
        >
          English
        </Button>
      </div>
    </div>
  );
}
