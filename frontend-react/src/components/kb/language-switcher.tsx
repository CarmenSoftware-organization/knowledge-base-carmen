"use client";

import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRANSLATE_LANGUAGES } from "@/configs/translate-languages";
import { getTranslateLang, setTranslateLang } from "@/lib/google-translate";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
  /** Full-width row for the mobile drawer. */
  fluid?: boolean;
  /** Desktop toolbar: compact trigger, no label. */
  toolbar?: boolean;
};

/**
 * Switches the page language through Google's Website Translator.
 *
 * There is no React state: the `googtrans` cookie is the language, and every
 * change reloads so Google's widget re-reads it. Reading the cookie during
 * render is safe because the value cannot change without that reload.
 */
export function LanguageSwitcher({ className, fluid, toolbar }: LanguageSwitcherProps) {
  const t = useTranslations("common");
  const current = getTranslateLang();

  const handleChange = (code: string) => {
    if (code === current) return;
    setTranslateLang(code);
    window.location.reload();
  };

  return (
    // translate="no" + notranslate: the options are language endonyms — ไทย,
    // 日本語, Русский — and the whole point is that a reader recognises their
    // own language's name. Translating them defeats the control.
    <div
      translate="no"
      className={cn(
        "notranslate flex items-center",
        toolbar
          ? "min-w-0 gap-1.5 border-0 bg-transparent p-0 shadow-none"
          : "gap-2 rounded-xl border border-primary/35 bg-primary/10 px-2 py-1 shadow-sm dark:border-primary/45 dark:bg-primary/15",
        fluid && "w-full min-w-0 flex-wrap sm:flex-nowrap",
        className,
      )}
      title={t("languageHint")}
    >
      <div
        className={cn(
          "flex min-w-0 shrink-0 items-center gap-1",
          toolbar ? "text-muted-foreground" : "text-primary",
        )}
      >
        <Languages className="size-4 shrink-0" aria-hidden />
        {!toolbar && (
          <span className="hidden min-[1200px]:inline text-[11px] font-bold uppercase tracking-wide text-primary">
            {t("languageLabel")}
          </span>
        )}
      </div>
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger
          size={toolbar ? "default" : "sm"}
          aria-label={t("languageLabel")}
          className={cn(
            "font-semibold text-foreground ring-0 focus:ring-2 focus:ring-primary/35 [&>span]:truncate",
            toolbar
              ? "min-w-[6rem] max-w-[10rem] shrink-0 rounded-full border border-input bg-background px-3 text-[13px] leading-tight shadow-none transition-colors duration-150 hover:bg-accent hover:text-white dark:hover:bg-accent dark:hover:text-foreground"
              : "rounded-lg border border-primary/25 bg-background/95 px-2 text-sm shadow-sm hover:bg-background dark:border-primary/35 dark:bg-background/90",
            fluid
              ? "min-w-0 w-full max-w-none flex-1 basis-[10rem]"
              : !toolbar && "min-w-[4.75rem] w-[min(7.25rem,28vw)] max-w-[7.5rem]",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        {/* Portaled into document.body, so the wrapper's marker does not reach it. */}
        <SelectContent translate="no" className="notranslate max-h-[60vh] rounded-xl">
          {TRANSLATE_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="rounded-lg font-medium">
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
