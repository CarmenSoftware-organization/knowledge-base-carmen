"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen, Home, Search } from "lucide-react";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <div className="fixed inset-0 z-[2100000] flex min-h-0 flex-col bg-background overflow-x-hidden overflow-y-auto">
      {/* Full viewport background (no KB header/footer) */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-background to-background"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(140vw,1600px)] select-none text-center font-black leading-none text-primary/[0.07] dark:text-primary/[0.12]"
        aria-hidden
      >
        <span className="block text-[clamp(5rem,42vw,22rem)] tracking-tighter">404</span>
      </div>

      <main className="relative z-10 flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-5 sm:px-10 md:px-14 lg:px-20 py-12 md:py-16 lg:py-24">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center gap-8 md:gap-12 lg:gap-14">
          <div className="relative flex items-center justify-center">
            <div className="rounded-3xl bg-primary/15 dark:bg-primary/20 p-6 md:p-8 ring-1 ring-primary/20 shadow-lg">
              <Search className="h-14 w-14 md:h-20 md:w-20 text-primary" strokeWidth={1.75} />
            </div>
          </div>

          <div className="space-y-4 md:space-y-5 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              {t("title")}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center w-full sm:w-auto">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 min-h-12 px-8 py-3 rounded-xl bg-primary text-primary-foreground text-base font-medium hover:bg-primary/90 transition-colors shadow-md"
            >
              <Home className="h-5 w-5 shrink-0" />
              {t("backHome")}
            </Link>
            <Link
              href="/categories"
              className="inline-flex items-center justify-center gap-2 min-h-12 px-8 py-3 rounded-xl border-2 border-border bg-background/80 backdrop-blur-sm text-base font-medium text-foreground hover:bg-secondary transition-colors"
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
