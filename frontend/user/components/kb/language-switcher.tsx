"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocaleCookie } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  /** Smaller EN/TH for tight header rows (mobile) */
  dense?: boolean;
};

export function LanguageSwitcher({ dense }: LanguageSwitcherProps) {
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
      dense
        ? "h-7 min-w-[1.75rem] rounded px-1.5 text-[10px] font-semibold transition-all"
        : "h-8 min-w-[2.25rem] rounded-md px-2 text-[11px] font-semibold transition-all",
      active
        ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/40"
        : "text-muted-foreground hover:bg-background/90 hover:text-foreground dark:hover:bg-background/50"
    );

  return (
    <div
      role="group"
      aria-label={t("languageHint")}
      title={t("languageHint")}
      className={cn(
        "flex items-center gap-0.5 rounded-lg bg-background/70 ring-1 ring-primary/20 dark:bg-background/50 dark:ring-primary/30",
        dense ? "p-px" : "p-0.5",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={segmentClass(locale === "en")}
        onClick={() => handleSwitch("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={segmentClass(locale === "th")}
        onClick={() => handleSwitch("th")}
      >
        TH
      </Button>
    </div>
  );
}
