"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocaleCookie } from "@/lib/locale";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const handleSwitch = (newLocale: string) => {
    if (newLocale === locale) return;
    setLocaleCookie(newLocale);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
      <Button
        variant={locale === "th" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-2.5 text-xs font-medium"
        onClick={() => handleSwitch("th")}
      >
        TH
      </Button>
      <Button
        variant={locale === "en" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-2.5 text-xs font-medium"
        onClick={() => handleSwitch("en")}
      >
        EN
      </Button>
    </div>
  );
}
