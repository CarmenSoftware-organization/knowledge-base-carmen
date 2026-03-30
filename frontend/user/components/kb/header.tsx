"use client";

import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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

// ─── Animation variants ────────────────────────────────────────────────────────

const headerVariants: Variants = {
  hidden: { y: -60, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 4,
    scale: 0.98,
    transition: { duration: 0.12 },
  },
};

const mobileMenuVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15 },
  },
};

const accordionVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  show: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.18 },
  },
};

// ─── Changelog config ──────────────────────────────────────────────────────────
// เรียงจากล่าสุด → เก่าสุด
const CHANGELOG_ORDER: string[] = [
  "mar2026",
  "feb2026",
  "nov2025",
  "sep2025",
  "jul2025",
  "may2025",
  "apr2025",
  "mar2025",
  "jan2025",
  "nov2024",
  "aug2024",
  "june2024",
  "may2024",
];

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

function sortChangelog(items: { slug: string; title: string }[]) {
  return [...items].sort((a, b) => {
    const ai = CHANGELOG_ORDER.indexOf(a.slug);
    const bi = CHANGELOG_ORDER.indexOf(b.slug);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function KBHeader() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileChangelogOpen, setMobileChangelogOpen] = useState(false);
  const [desktopChangelogOpen, setDesktopChangelogOpen] = useState(false);
  const [changelogItems, setChangelogItems] = useState<{ slug: string; title: string }[]>([]);

  const changelogRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileChangelogOpen(false);
  }, [pathname]);

  useEffect(() => {
    if ((!desktopChangelogOpen && !mobileChangelogOpen) || changelogItems.length > 0) return;
    getCategory("changelog")
      .then((data) => setChangelogItems(data.items || []))
      .catch(() => setChangelogItems([]));
  }, [desktopChangelogOpen, mobileChangelogOpen, changelogItems.length]);

  const sortedChangelog = sortChangelog(changelogItems);

  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/carmen-logo-light.png"
      : "/carmen02-logo.png";

  const closeMobile = () => {
    setMobileMenuOpen(false);
    setMobileChangelogOpen(false);
  };

  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate="show"
      className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-3">

          {/* ── Logo ── */}
          <Link href="/" className="shrink-0">
            <Image
              src={logoSrc}
              alt="Carmen Logo"
              width={140}
              height={40}
              className="h-auto w-auto max-h-10 rounded transition-opacity duration-200"
              style={{ width: "auto", height: "auto" }}
              priority
            />
          </Link>


          {/* ── Search bar: sm–lg (iPad) กลาง header / desktop ซ่อน เพราะ nav อยู่แทน ── */}
          {!isHome && (
            <div className="hidden sm:flex xl:hidden flex-1 mx-4">
              <GlobalSearch variant="header" />
            </div>
          )}

          {/* Desktop: search อยู่หลัง logo แทนเมื่อไม่มี nav บน sm */}
          {!isHome && (
            <div className="hidden xl:flex flex-1 max-w-xl mx-2">
              <GlobalSearch variant="header" />
            </div>
          )}

          {/* Spacer: home page — ดันทุก element ไปชิดขวาทุก breakpoint */}
          {isHome && <div className="flex-1" />}

          {/* ── Desktop nav ── */}
          <nav className="hidden xl:flex items-center gap-0.5">
            <NavLink href="/">{t("home")}</NavLink>
            <NavLink href="/categories">{t("categories")}</NavLink>

            {/* Changelog dropdown */}
            <div
              ref={changelogRef}
              className="relative"
              onMouseEnter={() => setDesktopChangelogOpen(true)}
              onMouseLeave={() => setDesktopChangelogOpen(false)}
            >
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-white dark:hover:text-foreground hover:bg-accent transition-colors duration-150">
                Changelog
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    desktopChangelogOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {desktopChangelogOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="absolute right-0 mt-1.5 w-72 rounded-lg border border-border bg-popover shadow-md z-50 overflow-hidden py-1"
                  >
                    {sortedChangelog.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">ยังไม่มีรายการ</p>
                    ) : (
                      sortedChangelog.map((item, index) => {
                        const label =
                          changelogTitleMap[item.slug] || item.title || item.slug;
                        const isNewest = index === 0;
                        return (
                          <Link
                            key={item.slug}
                            href={`/categories/changelog/${encodeURIComponent(item.slug)}`}
                            className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-white dark:hover:text-foreground hover:bg-accent transition-colors duration-100 group"
                          >
                            <span>{label}</span>
                            {isNewest && (
                              <span className="text-[10px] font-semibold text-red-500 tracking-wide ml-2 shrink-0">
                                new
                              </span>
                            )}
                          </Link>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <NavLink href="/faq">FAQ</NavLink>
          </nav>

          {/* ── Desktop utilities ── */}
          <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-border/60">
            <LanguageSwitcher />
            <BUSwitcher />
            <ThemeToggle />
          </div>

          {/* ── Mobile/iPad right-side: Burger เท่านั้น ── */}
          <div className="xl:hidden flex items-center ml-auto">
            <button
              className="p-2 rounded-md text-muted-foreground hover:text-white dark:hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileMenuOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="block"
                  >
                    <X className="h-5 w-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="open"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="block"
                  >
                    <Menu className="h-5 w-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* ── Mobile menu dropdown — overlay ไม่ดัน layout ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="xl:hidden fixed left-0 right-0 top-14 z-40 border-t border-b border-border/60 bg-background/98 backdrop-blur-md shadow-lg pb-4"
            >
              {/* Search bar — แสดงเฉพาะ mobile (< sm) เท่านั้น iPad มีใน header แล้ว */}
              {!isHome && (
                <div className="pt-3 pb-2 sm:hidden">
                  <GlobalSearch variant="header" />
                </div>
              )}

              <div className="pt-2 flex flex-col">
                <MobileNavLink href="/" onClick={closeMobile}>{t("home")}</MobileNavLink>
                <MobileNavLink href="/categories" onClick={closeMobile}>{t("categories")}</MobileNavLink>

                {/* Changelog accordion */}
                <div>
                  <button
                    onClick={() => setMobileChangelogOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-white dark:hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <span>Changelog</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        mobileChangelogOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {mobileChangelogOpen && (
                      <motion.div
                        variants={accordionVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="overflow-hidden"
                      >
                        <div className="ml-3 pl-3 border-l border-border/60 flex flex-col gap-0.5 py-1">
                          {sortedChangelog.length === 0 ? (
                            <p className="px-2 py-1.5 text-xs text-muted-foreground">
                              ยังไม่มีรายการ
                            </p>
                          ) : (
                            sortedChangelog.map((item, index) => {
                              const label =
                                changelogTitleMap[item.slug] || item.title || item.slug;
                              const isNewest = index === 0;
                              return (
                                <Link
                                  key={item.slug}
                                  href={`/categories/changelog/${encodeURIComponent(item.slug)}`}
                                  onClick={closeMobile}
                                  className="flex items-center justify-between px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-white dark:hover:text-foreground hover:bg-accent transition-colors"
                                >
                                  <span>{label}</span>
                                  {isNewest && (
                                    <span className="text-[10px] font-semibold text-red-500 tracking-wide ml-2 shrink-0">
                                      new
                                    </span>
                                  )}
                                </Link>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <MobileNavLink href="/faq" onClick={closeMobile}>FAQ</MobileNavLink>
              </div>

              {/* Utilities row — Language, BU switcher, Theme */}
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2 px-3">
                <LanguageSwitcher />
                <BUSwitcher />
                <div className="ml-auto">
                  <ThemeToggle />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${
        isActive
          ? "text-white bg-accent dark:text-foreground"
          : "text-muted-foreground hover:text-white dark:hover:text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
        isActive
          ? "text-white bg-accent dark:text-foreground"
          : "text-muted-foreground hover:text-white dark:hover:text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </Link>
  );
}