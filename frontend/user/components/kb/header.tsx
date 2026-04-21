"use client";

import Link from "next/link";
import { Menu, X, Headset } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { GlobalSearch } from "@/components/search/global-search";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "next-themes";
import { BUSwitcher } from "./bu-switcher";
import { LanguageSwitcher } from "./language-switcher";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { notifyKbHeaderScrollHidden } from "@/lib/kb-scroll-chrome";

// ─── Animation variants ────────────────────────────────────────────────────────

const headerVariants: Variants = {
  hidden: { y: -60, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    pointerEvents: "auto",
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  scrollHidden: {
    y: "-100%",
    pointerEvents: "none",
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
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

const mobileBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

/** Support button: same pill style as language switcher (h-9) */
const headerSupportButtonClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-primary transition-colors hover:bg-primary/15 hover:border-primary/50 dark:border-primary/45 dark:bg-primary/15 active:scale-[0.98]";

/** Same Zoho support form as footer / BU landing */
const ZOHO_CONTACT_CENTER_URL =
  "https://forms.zohopublic.com/carmensoftware/form/Contactforsupport/formperma/u00Cn7XaD_LKMPjMYBVbZxAe7redlAiayQxwJJqnsLI?zf_enablecamera=true";

// ─── Component ─────────────────────────────────────────────────────────────────

export function KBHeader() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollHidden, setScrollHidden] = useState(false);

  const lastScrollY = useRef(0);
  const scrollRaf = useRef<number>(0);
  const menuOpenRef = useRef({ mobile: false });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    menuOpenRef.current = { mobile: mobileMenuOpen };
  }, [mobileMenuOpen]);

  const closeMobile = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      setScrollHidden(false);
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    const effectiveHidden = reduceMotion ? false : scrollHidden;
    notifyKbHeaderScrollHidden(effectiveHidden);
  }, [scrollHidden, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;

    const TOP_SHOW = 32;
    const DELTA = 8;

    const onScroll = () => {
      cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        const m = menuOpenRef.current;
        if (m.mobile) {
          setScrollHidden(false);
          lastScrollY.current = y;
          return;
        }

        const prev = lastScrollY.current;
        if (y < TOP_SHOW) {
          setScrollHidden(false);
        } else if (y > prev + DELTA) {
          setScrollHidden(true);
        } else if (y < prev - DELTA) {
          setScrollHidden(false);
        }
        lastScrollY.current = y;
      });
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(scrollRaf.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduceMotion]);

  useEffect(() => {
    lastScrollY.current = typeof window !== "undefined" ? window.scrollY : 0;
    setScrollHidden(false);
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen, closeMobile]);

  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/carmen-logo-light.png"
      : "/carmen02-logo.png";

  const headerAnimate =
    reduceMotion || !scrollHidden ? "show" : "scrollHidden";

  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate={headerAnimate}
      className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md will-change-transform"
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative z-10 flex h-14 items-center gap-1.5 sm:gap-3 min-w-0 isolate">

          <Link href="/" className="relative z-[2] shrink-0 min-w-0 max-w-[42%] sm:max-w-none">
            <Image
              src={logoSrc}
              alt="Carmen Logo"
              width={140}
              height={40}
              className="h-auto w-auto max-h-7 max-w-[96px] sm:max-h-8 sm:max-w-[112px] md:max-h-10 md:max-w-[140px] rounded transition-opacity duration-200"
              style={{ width: "auto", height: "auto" }}
              priority
            />
          </Link>

          {!isHome && (
            <div className="hidden sm:flex xl:hidden flex-1 min-w-0 mx-2 md:mx-3">
              <GlobalSearch variant="header" className="w-full min-w-0" />
            </div>
          )}

          {!isHome && (
            <div className="hidden xl:flex flex-1 max-w-xl min-w-0 mx-2">
              <GlobalSearch variant="header" className="w-full min-w-0" />
            </div>
          )}

          {isHome && <div className="flex-1 min-w-0 xl:flex-1" />}

          <nav className="hidden xl:flex items-center gap-1">
            <NavLink compact href="/">
              {t("home")}
            </NavLink>
            {!isHome && (
              <>
                <NavLink compact href="/categories">
                  {t("categories")}
                </NavLink>
                <NavLink
                  compact
                  href="/faq"
                  isActive={
                    pathname === "/faq" ||
                    pathname.startsWith("/faq/") ||
                    pathname.startsWith("/categories/faq")
                  }
                >
                  FAQ
                </NavLink>
              </>
            )}
            <NavLink
              compact
              href="/categories/changelog"
              isActive={pathname.startsWith("/categories/changelog")}
            >
              Changelog
            </NavLink>
          </nav>

          {/* ── Desktop utilities ── */}
          <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-border/60 min-w-0">
            <LanguageSwitcher />
            {!isHome && <BUSwitcher toolbar />}
            <a
              href={ZOHO_CONTACT_CENTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={headerSupportButtonClass}
              aria-label={t("contactCenter")}
              title={t("contactCenter")}
            >
              <Headset className="size-4 shrink-0" aria-hidden />
            </a>
            <ThemeToggle compact />
          </div>

          <div className="xl:hidden ml-auto flex items-center justify-end gap-2 shrink-0">
            <div className="shrink-0 hidden min-[360px]:block">
              <LanguageSwitcher />
            </div>
            <a
              href={ZOHO_CONTACT_CENTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(headerSupportButtonClass, "relative z-[2]")}
              aria-label={t("contactCenter")}
              title={t("contactCenter")}
            >
              <Headset className="size-4 shrink-0" aria-hidden />
            </a>
            <button
              type="button"
              className="relative z-[2] inline-flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-md sm:rounded-lg text-muted-foreground hover:text-white dark:hover:text-foreground hover:bg-accent transition-colors touch-manipulation"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
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

        {/* ── Mobile / iPad drawer + backdrop ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.button
                key="nav-backdrop"
                type="button"
                variants={mobileBackdropVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                aria-label="Close menu"
                className="xl:hidden fixed inset-0 top-14 z-[45] bg-black/45 backdrop-blur-[2px] border-0 cursor-pointer p-0 m-0"
                onClick={closeMobile}
              />
              <motion.div
                key="nav-panel"
                variants={mobileMenuVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="xl:hidden fixed left-0 right-0 top-14 z-[48] max-h-[min(85dvh,calc(100dvh-3.5rem))] overflow-y-auto overscroll-y-contain border-b border-border/60 bg-background/98 backdrop-blur-md shadow-xl rounded-b-2xl sm:rounded-b-xl"
                role="dialog"
                aria-modal="true"
                aria-label="Main menu"
              >
              {!isHome && (
                <div className="px-3 pt-3 pb-2 sm:hidden">
                  <GlobalSearch variant="header" className="w-full min-w-0" />
                </div>
              )}

              <div className="px-1.5 sm:px-2 pt-1 pb-2 flex flex-col gap-0.5">
                <MobileNavLink href="/" onClick={closeMobile}>{t("home")}</MobileNavLink>
                {!isHome && (
                  <div className="grid grid-cols-2 gap-2 px-0.5">
                    <MobileNavLink href="/categories" onClick={closeMobile}>
                      {t("categories")}
                    </MobileNavLink>
                    <MobileNavLink
                      href="/faq"
                      onClick={closeMobile}
                      isActive={
                        pathname === "/faq" ||
                        pathname.startsWith("/faq/") ||
                        pathname.startsWith("/categories/faq")
                      }
                    >
                      FAQ
                    </MobileNavLink>
                  </div>
                )}
                <MobileNavLink
                  href="/categories/changelog"
                  onClick={closeMobile}
                  isActive={pathname.startsWith("/categories/changelog")}
                >
                  Changelog
                </MobileNavLink>

              </div>

              <div className="mt-2 pt-3 border-t border-border/60 space-y-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="min-[360px]:hidden">
                  <LanguageSwitcher />
                </div>
                {!isHome && <BUSwitcher fluid />}
                <div className="flex items-center justify-end gap-2">
                  <ThemeToggle />
                </div>
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function NavLink({
  href,
  children,
  isActive: isActiveOverride,
  compact,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
  /** Desktop nav: pill style */
  compact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = isActiveOverride ?? pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "font-medium transition-colors duration-150",
        compact
          ? "inline-flex h-9 items-center rounded-full px-3 text-xs"
          : "rounded-md px-3 py-1.5 text-sm",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-white dark:hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
  isActive: isActiveOverride,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  const pathname = usePathname();
  const isActive = isActiveOverride ?? pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex min-h-11 items-center rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-150 touch-manipulation active:scale-[0.99] ${
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-white dark:hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}