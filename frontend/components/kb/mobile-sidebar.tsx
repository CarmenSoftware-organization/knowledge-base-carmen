"use client";

import { useState, useEffect } from "react";
import { Menu, ChevronRight, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { KBSidebar } from "./sidebar";
import { TableOfContents } from "./toc";
import { FaqSidebarNav } from "./faq-sidebar";
import { ChangelogSidebarNav } from "./changelog-sidebar";
import { cn } from "@/lib/utils";
import { usePathname, useParams } from "next/navigation";
import type { FaqWikiItem } from "@/lib/faq-nav";
import type { ChangelogListEntry } from "@/lib/changelog-utils";
import { subscribeKbHeaderScrollHidden } from "@/lib/kb-scroll-chrome";

/** Sub-bar offset: header (56) + bar (48) + gap — sync hide with KBHeader */
const MOBILE_SUBBAR_HIDE_Y = -(56 + 48 + 6);

type MobileSidebarProps = {
  faqItems?: FaqWikiItem[];
  changelogItems?: ChangelogListEntry[];
};

export function MobileSidebar({ faqItems, changelogItems }: MobileSidebarProps) {
  const [activeDrawer, setActiveDrawer] = useState<"menu" | "toc" | null>(null);
  const [headerScrollHidden, setHeaderScrollHidden] = useState(false);
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const params = useParams();
  const isArticlePage = !!params.article;

  const hideKbManualMenu =
    pathname === "/faq" ||
    pathname.startsWith("/faq/") ||
    pathname.startsWith("/categories/faq") ||
    pathname.startsWith("/categories/changelog");

  const hasFaqNav = Boolean(faqItems?.length);
  const hasChangelogNav = Boolean(changelogItems?.length);

  const showMobileSubBar =
    !hideKbManualMenu ||
    isArticlePage ||
    (hideKbManualMenu && hasFaqNav) ||
    (hideKbManualMenu && hasChangelogNav);

  const openMenuDrawer =
    !hideKbManualMenu || hasFaqNav || hasChangelogNav;

  useEffect(() => {
    setActiveDrawer(null);
  }, [pathname]);

  useEffect(() => {
    return subscribeKbHeaderScrollHidden(setHeaderScrollHidden);
  }, []);

  const closeDrawer = () => setActiveDrawer(null);

  const subBarY =
    reduceMotion || !headerScrollHidden || activeDrawer ? 0 : MOBILE_SUBBAR_HIDE_Y;

  return (
    <>
      {showMobileSubBar && (
        <motion.div
          className="lg:hidden sticky top-14 z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-700/60 will-change-transform"
          initial={false}
          animate={{ y: subBarY }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className={cn(
              "flex items-center px-3 sm:px-4 h-11 sm:h-12",
              hideKbManualMenu &&
                isArticlePage &&
                !hasFaqNav &&
                !hasChangelogNav &&
                "justify-end",
              hideKbManualMenu &&
                isArticlePage &&
                (hasFaqNav || hasChangelogNav) &&
                "justify-between",
              !hideKbManualMenu && isArticlePage && "justify-between",
              !hideKbManualMenu && !isArticlePage && "justify-start",
              hideKbManualMenu &&
                !isArticlePage &&
                (hasFaqNav || hasChangelogNav) &&
                "justify-start",
            )}
          >
            {!hideKbManualMenu && (
              <button
                onClick={() => setActiveDrawer("menu")}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-muted-foreground dark:text-zinc-400 hover:text-primary dark:hover:text-zinc-100 transition-colors touch-manipulation"
              >
                <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>Menu</span>
              </button>
            )}
            {hideKbManualMenu && hasFaqNav && (
              <button
                onClick={() => setActiveDrawer("menu")}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-muted-foreground dark:text-zinc-400 hover:text-primary dark:hover:text-zinc-100 transition-colors touch-manipulation"
              >
                <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>FAQ</span>
              </button>
            )}
            {hideKbManualMenu && hasChangelogNav && (
              <button
                onClick={() => setActiveDrawer("menu")}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-muted-foreground dark:text-zinc-400 hover:text-primary dark:hover:text-zinc-100 transition-colors touch-manipulation"
              >
                <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>Changelog</span>
              </button>
            )}
            {isArticlePage && (
              <button
                onClick={() => setActiveDrawer("toc")}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-muted-foreground dark:text-zinc-400 hover:text-primary dark:hover:text-zinc-100 transition-colors"
              >
                <span className="hidden min-[380px]:inline">On this page</span>
                <span className="min-[380px]:hidden">TOC</span>
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 dark:bg-black/60 z-[110] backdrop-blur-sm transition-opacity duration-300",
          activeDrawer ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeDrawer}
      />

      {/* Menu drawer */}
      {openMenuDrawer && (
        <div
          className={cn(
            "fixed inset-y-0 left-0 w-[280px] bg-white dark:bg-zinc-900 z-[120] shadow-2xl dark:shadow-black/50 transition-transform duration-300 ease-in-out",
            activeDrawer === "menu" ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700/60 flex justify-between items-center">
              <span className="font-bold text-primary dark:text-zinc-100">
                {hideKbManualMenu && hasFaqNav
                  ? "เมนู FAQ"
                  : hideKbManualMenu && hasChangelogNav
                    ? "Changelog"
                    : "เมนูเอกสาร"}
              </span>
              <button
                onClick={closeDrawer}
                className="text-muted-foreground dark:text-zinc-400 p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] p-4">
              {hideKbManualMenu && hasFaqNav && faqItems ? (
                <FaqSidebarNav
                  items={faqItems}
                  showHomeLink
                  className="max-h-none pr-0"
                />
              ) : hideKbManualMenu && hasChangelogNav && changelogItems ? (
                <ChangelogSidebarNav
                  items={changelogItems}
                  showOverviewLink
                  className="max-h-none pr-0"
                />
              ) : (
                <KBSidebar isMobile />
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOC drawer — overflow-y-auto here is what TOC's auto-scroll targets via .closest(".overflow-y-auto") */}
      {isArticlePage && (
        <div
          className={cn(
            "fixed inset-y-0 right-0 w-[280px] bg-white dark:bg-zinc-900 z-[120] shadow-2xl dark:shadow-black/50 transition-transform duration-300 ease-in-out",
            activeDrawer === "toc" ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700/60 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50">
              <span className="font-bold text-primary dark:text-zinc-100 italic">
                On this page
              </span>
              <button
                onClick={closeDrawer}
                className="text-muted-foreground dark:text-zinc-400 p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* overflow-y-auto on this div so TOC's closest(".overflow-y-auto") finds it correctly */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] p-6">
              <TableOfContents isMobile onClose={closeDrawer} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}