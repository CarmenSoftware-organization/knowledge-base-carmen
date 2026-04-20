"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocaleCookie } from "@/lib/locale";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  /** @deprecated Ignored; single style at all breakpoints */
  dense?: boolean;
  /** @deprecated Ignored; single style at all breakpoints */
  toolbar?: boolean;
};

export function LanguageSwitcher(_props: LanguageSwitcherProps = {}) {
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
      "flex flex-1 items-center justify-center rounded-full px-2 text-xs font-bold transition-colors duration-150 min-w-[2rem] sm:min-w-[2.25rem]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-foreground/85 hover:bg-primary/15 dark:text-muted-foreground dark:hover:bg-primary/20",
    );

  return (
    <div
      role="group"
      aria-label={t("languageHint")}
      title={t("languageHint")}
      className={cn(
        "inline-flex h-9 shrink-0 items-stretch gap-px rounded-full border border-primary/35 bg-primary/10 p-0.5 dark:border-primary/45 dark:bg-primary/15",
      )}
    >
      <button
        type="button"
        className={segmentClass(locale === "th")}
        aria-pressed={locale === "th"}
        onClick={() => handleSwitch("th")}
      >
        TH
      </button>
      <button
        type="button"
        className={segmentClass(locale === "en")}
        aria-pressed={locale === "en"}
        onClick={() => handleSwitch("en")}
      >
        EN
      </button>
    </div>
  );
}
