"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen, Home, Search } from "lucide-react";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <div className="fixed inset-0 z-[2100000] overflow-x-hidden overflow-y-auto overscroll-y-contain bg-background touch-pan-y [-webkit-overflow-scrolling:touch]">
      {/* Full viewport background (no KB header/footer) */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-background to-background"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "clamp(24px, 6vw, 32px) clamp(24px, 6vw, 32px)",
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(140vw,1600px)] select-none text-center font-black leading-none text-primary/[0.07] dark:text-primary/[0.12]"
        aria-hidden
      >
        <span className="block text-[clamp(4.5rem,min(38vw,22rem),22rem)] tracking-tighter md:text-[clamp(6rem,34vw,20rem)] lg:text-[clamp(7rem,28vw,22rem)]">
          404
        </span>
      </div>

      {/* No flex-1 on main — fixes iPad/Safari scroll (height lock) */}
      <main className="relative z-10 box-border flex w-full min-h-[100svh] min-h-[100dvh] flex-col items-center justify-center px-4 py-12 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-14 md:px-10 md:py-16 min-[834px]:px-12 min-[834px]:py-16 lg:px-16 lg:py-20 xl:px-20">
        <div className="w-full max-w-4xl min-[834px]:max-w-2xl lg:max-w-4xl mx-auto flex flex-col items-center text-center gap-6 sm:gap-8 md:gap-10 lg:gap-12 xl:gap-14">
          <div className="relative flex items-center justify-center">
            <div className="rounded-2xl sm:rounded-3xl bg-primary/15 dark:bg-primary/20 p-5 sm:p-6 md:p-7 lg:p-8 ring-1 ring-primary/20 shadow-lg">
              <Search
                className="h-12 w-12 sm:h-14 sm:w-14 md:h-[3.75rem] md:w-[3.75rem] lg:h-20 lg:w-20 text-primary"
                strokeWidth={1.75}
              />
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4 md:space-y-5 max-w-xl sm:max-w-2xl min-[834px]:max-w-lg lg:max-w-2xl mx-auto px-1">
            <h1 className="text-balance text-2xl sm:text-4xl md:text-[2.25rem] md:leading-tight lg:text-5xl xl:text-6xl font-bold text-foreground tracking-tight">
              {t("title")}
            </h1>
            <p className="text-pretty text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-prose mx-auto">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex w-full max-w-md sm:max-w-none flex-col min-[480px]:flex-row flex-wrap gap-3 sm:gap-3.5 md:gap-4 justify-center sm:w-auto px-0 sm:px-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 min-h-11 min-[480px]:min-h-12 w-full min-[480px]:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-primary text-primary-foreground text-sm sm:text-base font-medium hover:bg-primary/90 transition-colors shadow-md touch-manipulation active:scale-[0.99]"
            >
              <Home className="h-5 w-5 shrink-0" />
              {t("backHome")}
            </Link>
            <Link
              href="/categories"
              className="inline-flex items-center justify-center gap-2 min-h-11 min-[480px]:min-h-12 w-full min-[480px]:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl border-2 border-border bg-background/80 backdrop-blur-sm text-sm sm:text-base font-medium text-foreground hover:bg-secondary transition-colors touch-manipulation active:scale-[0.99]"
            >
              <BookOpen className="h-5 w-5 shrink-0" />
              {t("browseCategories")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
