"use client";

import { useState, useEffect } from "react";
import { Menu, ChevronRight, X } from "lucide-react"; 
import { KBSidebar } from "./sidebar";
import { TableOfContents } from "./toc";
import { FaqSidebarNav } from "./faq-sidebar";
import { cn } from "@/lib/utils";
import { usePathname, useParams } from "next/navigation";
import type { FaqWikiItem } from "@/lib/faq-nav";

type MobileSidebarProps = {
  /** รายการ FAQ จาก server — ถ้ามี จะแสดงเมนู FAQ แทนเมนูคู่มือเมื่ออยู่ในโซน FAQ */
  faqItems?: FaqWikiItem[];
};

export function MobileSidebar({ faqItems }: MobileSidebarProps) {
  const [activeDrawer, setActiveDrawer] = useState<"menu" | "toc" | null>(null);
  const pathname = usePathname();
  const params = useParams();
  const isArticlePage = !!params.article;

  /** FAQ ใช้ navigation แยก — ไม่แสดงเมนูคู่มือ (KBSidebar) บนมือถือ */
  const hideKbManualMenu =
    pathname === "/faq" ||
    pathname.startsWith("/faq/") ||
    pathname.startsWith("/categories/faq");

  const hasFaqNav = Boolean(faqItems?.length);

  const showMobileSubBar =
    !hideKbManualMenu || isArticlePage || (hideKbManualMenu && hasFaqNav);

  const openMenuDrawer = !hideKbManualMenu || hasFaqNav;

  useEffect(() => {
    setActiveDrawer(null);
  }, [pathname]);

  const closeDrawer = () => setActiveDrawer(null);

  return (
    <>
      {/* 📱 Sticky Sub-Header — ซ่อนทั้งแถบบน /faq ที่ไม่ใช่บทความ; บทความ FAQ ยังมีปุ่ม TOC */}
      {showMobileSubBar && (
        <div className="lg:hidden sticky top-[64px] z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-700/60">
          <div
            className={cn(
              "flex items-center px-4 h-12",
              hideKbManualMenu &&
                isArticlePage &&
                !hasFaqNav &&
                "justify-end",
              hideKbManualMenu &&
                isArticlePage &&
                hasFaqNav &&
                "justify-between",
              !hideKbManualMenu && isArticlePage && "justify-between",
              !hideKbManualMenu && !isArticlePage && "justify-start",
              hideKbManualMenu && !isArticlePage && hasFaqNav && "justify-start"
            )}
          >
            {!hideKbManualMenu && (
              <button
                onClick={() => setActiveDrawer("menu")}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground dark:text-zinc-400 hover:text-primary dark:hover:text-zinc-100 transition-colors"
              >
                <Menu className="h-4 w-4" />
                <span>Menu</span>
              </button>
            )}
            {hideKbManualMenu && hasFaqNav && (
              <button
                onClick={() => setActiveDrawer("menu")}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground dark:text-zinc-400 hover:text-primary dark:hover:text-zinc-100 transition-colors"
              >
                <Menu className="h-4 w-4" />
                <span>FAQ</span>
              </button>
            )}

            {isArticlePage && (
              <button
                onClick={() => setActiveDrawer("toc")}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground dark:text-zinc-400 hover:text-primary dark:hover:text-zinc-100 transition-colors"
              >
                <span>On this page</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 dark:bg-black/60 z-[110] backdrop-blur-sm transition-opacity duration-300",
          activeDrawer ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={closeDrawer} 
      />
      
      {/* Drawer Menu — คู่มือ หรือ FAQ */}
      {openMenuDrawer && (
        <div className={cn(
          "fixed inset-y-0 left-0 w-[280px] bg-white dark:bg-zinc-900 z-[120] shadow-2xl dark:shadow-black/50 transition-transform duration-300 ease-in-out",
          activeDrawer === "menu" ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700/60 flex justify-between items-center">
              <span className="font-bold text-primary dark:text-zinc-100">
                {hideKbManualMenu && hasFaqNav ? "เมนู FAQ" : "เมนูเอกสาร"}
              </span>
              <button 
                onClick={closeDrawer} 
                className="text-muted-foreground dark:text-zinc-400 p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {hideKbManualMenu && hasFaqNav && faqItems ? (
                <FaqSidebarNav
                  items={faqItems}
                  showHomeLink
                  className="max-h-none pr-0"
                />
              ) : (
                <KBSidebar isMobile />
              )}
            </div>
          </div>
        </div>
      )}

      {isArticlePage && (
        <div className={cn(
          "fixed inset-y-0 right-0 w-[280px] bg-white dark:bg-zinc-900 z-[120] shadow-2xl dark:shadow-black/50 transition-transform duration-300 ease-in-out",
          activeDrawer === "toc" ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700/60 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50">
              <span className="font-bold text-primary dark:text-zinc-100 italic">On this page</span>
              <button 
                onClick={closeDrawer} 
                className="text-muted-foreground dark:text-zinc-400 p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 mobile-toc-container">
               <TableOfContents isMobile onClose={closeDrawer} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}