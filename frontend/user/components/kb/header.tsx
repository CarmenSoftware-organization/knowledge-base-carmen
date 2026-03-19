"use client";

import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { GlobalSearch } from "@/components/search/global-search";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "next-themes";
import { BUSwitcher } from "./bu-switcher";
import { LanguageSwitcher } from "./language-switcher";
import { useTranslations } from "next-intl";
import { getCategory } from "@/lib/wiki-api";

const headerVariants: Variants = {
  hidden: { y: -60, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

const mobileMenuVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

export function KBHeader() {
  const t = useTranslations("common");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [changelogItems, setChangelogItems] = useState<{ slug: string; title: string }[]>([]);
  const pathname = usePathname();
  const isHome = pathname === "/";

  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const changelogTitleMap: Record<string, string> = {
    mar2026: "March 2026 Release Information",
    feb2026: "February 2026 Release Information",
    nov2025: "November 2025 Release Information",
    sep2025: "September 2025 Release Information",
    jul2025: "July 2025 Release Information",
    may2025: "May 2025 Release Information",
    apr2025: "April 2025 Release Information",
    mar2025: "March 2025 Release Information",
    jan2025: "January 2025 Release Information",
    nov2024: "November 2024 Release Information",
    aug2024: "August 2024 Release Information",
    june2024: "June 2024 Release Information",
    may2024: "May 2024 Release Information",
  };

  useEffect(() => {
    if (!changelogOpen || changelogItems.length > 0) return;
    // โหลด changelog จากหมวด changelog (ถ้าไม่มี จะเงียบ ๆ)
    getCategory("changelog")
      .then((data) => {
        setChangelogItems(data.items || []);
      })
      .catch(() => {
        setChangelogItems([]);
      });
  }, [changelogOpen, changelogItems.length]);

  const logoSrc = mounted && resolvedTheme === "dark"
    ? "/carmen-logo-light.png"
    : "/carmen02-logo.png";

  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate="show"
      className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur shadow-sm"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image
              src={logoSrc}
              alt="Carmen Logo"
              width={170}
              height={170}
              className="rounded transition-all duration-300"
              priority
            />
          </Link>

          {/* Search — แสดงตั้งแต่ sm (iPad) ขึ้นไป */}
          {!isHome && (
            <div className="hidden sm:flex flex-1 max-w-2xl mx-4">
              <GlobalSearch variant="header" />
            </div>
          )}

          <div className="flex items-center gap-1">

            {/* Desktop nav — lg ขึ้นไปเท่านั้น */}
            <nav className="hidden lg:flex items-center gap-1 mr-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">{t("home")}</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/categories">{t("categories")}</Link>
              </Button>

              {/* Changelog dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setChangelogOpen(true)}
                onMouseLeave={() => setChangelogOpen(false)}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <span>Changelog</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>

                <AnimatePresence>
                  {changelogOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-1 w-72 rounded-xl border bg-popover shadow-lg z-50 py-2"
                    >
                      {changelogItems.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          ยังไม่มีรายการ Changelog
                        </div>
                      )}
                      {changelogItems.map((item) => {
                        const slug = item.slug;
                        const label =
                          changelogTitleMap[slug] ||
                          item.title ||
                          slug;
                        return (
                          <Link
                            key={slug}
                            href={`/categories/changelog/${encodeURIComponent(slug)}`}
                            className="block px-3 py-2 text-xs text-left hover:bg-muted transition-colors"
                          >
                            {label}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button variant="ghost" size="sm" asChild>
                <Link href="/faq">FAQ</Link>
              </Button>
            </nav>

            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
            <div className="hidden lg:block">
              <BUSwitcher />
            </div>
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            {/* Hamburger — mobile & iPad (ซ่อนที่ lg ขึ้นไป) */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

          </div>
        </div>

        {/* Mobile/iPad dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="lg:hidden border-t border-border py-4 space-y-4 px-2"
            >
              {/* Search เฉพาะ mobile เท่านั้น เพราะ sm ขึ้นไปแสดงใน header แล้ว */}
              {!isHome && (
                <div className="pb-2 sm:hidden">
                  <GlobalSearch variant="header" />
                </div>
              )}
              <nav className="flex flex-col gap-1">
                <Button variant="ghost" className="justify-start h-12 rounded-xl" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link href="/">{t("home")}</Link>
                </Button>
                <Button variant="ghost" className="justify-start h-12 rounded-xl" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link href="/categories">{t("categories")}</Link>
                </Button>
                {changelogItems.map((item) => {
                  const slug = item.slug;
                  const label =
                    changelogTitleMap[slug] ||
                    item.title ||
                    slug;
                  return (
                    <Button
                      key={slug}
                      variant="ghost"
                      className="justify-start h-12 rounded-xl"
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href={`/categories/changelog/${encodeURIComponent(slug)}`}>
                        {label}
                      </Link>
                    </Button>
                  );
                })}
                <Button variant="ghost" className="justify-start h-12 rounded-xl" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link href="/faq">FAQ</Link>
                </Button>
                <div className="px-3 py-1">
                  <LanguageSwitcher />
                </div>
                <div className="px-3 py-1">
                  <BUSwitcher />
                </div>
                <ThemeToggle />
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}