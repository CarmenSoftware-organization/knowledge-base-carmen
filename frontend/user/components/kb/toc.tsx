"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";

export function TableOfContents({ isMobile = false, onClose }: { isMobile?: boolean, onClose?: () => void }) {
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const [activeId, setActiveId] = useState("");
  const locale = useLocale();
  const t = useTranslations("article");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll("article h2")) as HTMLElement[];

    const elements = sections.map((elem) => ({
      id: elem.id,
      text: elem.textContent || "",
    }));
    setHeadings(elements);
    setActiveId("");

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top)
          );

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-120px 0px -60% 0px",
        threshold: 0.1,
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [locale]);

  if (headings.length === 0) return null;

  return (
    <aside className={cn(
      isMobile ? "block" : "hidden xl:block w-64 shrink-0 h-fit sticky top-28"
    )}>
      <div className={cn(!isMobile && "border-l-2 border-gray-100 pl-4 relative")}>
        {!isMobile && (
          <p className="text-[11px] font-bold uppercase text-muted-foreground/50 mb-4 tracking-widest">
            {t("onThisPage")}
          </p>
        )}

        <nav className="flex flex-col gap-1 relative">
          {headings.map((h) => {
            const isActive = activeId === h.id;
            return (
              <a
                key={h.id}
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(h.id);
                  if (el) {
                    const offset = 96;
                    const top = el.getBoundingClientRect().top + window.scrollY - offset;
                    window.scrollTo({ top, behavior: "smooth" });
                  }
                  isMobile && onClose?.();
                }}
                className={cn(
                  "relative text-[13px] py-1.5 transition-all duration-200 pl-4 -ml-[18px] border-l-2",
                  isActive
                    ? "text-primary font-bold border-primary"
                    : "text-muted-foreground hover:text-primary hover:border-gray-300 border-transparent"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-primary/10 -z-10 rounded-r-md"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{h.text}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}