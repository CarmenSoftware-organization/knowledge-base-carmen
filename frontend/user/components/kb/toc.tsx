"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

export function TableOfContents({
  isMobile = false,
  onClose,
}: {
  isMobile?: boolean;
  onClose?: () => void;
}) {
  const [headings, setHeadings] = useState<
    { id: string; text: string; key: string }[]
  >([]);
  const [activeId, setActiveId] = useState("");
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const locale = useLocale();
  const t = useTranslations("article");

  // Build heading list
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll("article h2")
    ) as HTMLElement[];

    const idCount = new Map<string, number>();
    const seenHeadingKey = new Set<string>();
    const elements: { id: string; text: string; key: string }[] = [];

    for (const elem of sections) {
      const id = elem.id?.trim();
      if (!id) continue;
      const text = (elem.textContent || "").trim();
      const uniqueHeadingKey = `${id}::${text}`;

      // Prevent duplicated TOC entries that can happen after refresh/hydration.
      if (seenHeadingKey.has(uniqueHeadingKey)) continue;
      seenHeadingKey.add(uniqueHeadingKey);

      const seen = idCount.get(id) || 0;
      idCount.set(id, seen + 1);
      elements.push({
        id,
        text,
        key: seen === 0 ? id : `${id}-${seen}`,
      });
    }

    setHeadings(elements);
    if (elements.length > 0) setActiveId(elements[0].id);
  }, [locale]);

  // Track active heading from scroll position for more precise behavior
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll("article h2")
    ) as HTMLElement[];
    if (sections.length === 0) return;

    const scrollOffset = 120;

    const updateActiveHeading = () => {
      const normalizedSections = sections.filter((section) => section.id?.trim());
      if (normalizedSections.length === 0) return;

      let nextActiveId = normalizedSections[0]?.id ?? "";
      const thresholdTop = scrollOffset;

      // Pick the last heading that has crossed the threshold line.
      for (const section of normalizedSections) {
        const top = section.getBoundingClientRect().top;
        if (top <= thresholdTop) {
          nextActiveId = section.id;
        } else {
          break;
        }
      }

      // Keep last heading active once user reaches the article bottom
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8
      ) {
        nextActiveId =
          normalizedSections[normalizedSections.length - 1]?.id ?? nextActiveId;
      }

      setActiveId((prev) => (prev === nextActiveId ? prev : nextActiveId));
    };

    updateActiveHeading();
    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("resize", updateActiveHeading);

    return () => {
      window.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [headings, locale]);

  // Auto-scroll nav so active link stays visible
  // Works for BOTH desktop sidebar (overflow on <nav>) and mobile drawer (overflow on parent div)
  useEffect(() => {
    if (!activeId) return;
    const nav = navRef.current;
    const link = linkRefs.current.get(activeId);
    if (!nav || !link) return;

    // For mobile: nav has no overflow, so scroll its closest scrollable parent
    const scrollContainer = isMobile
      ? (nav.closest(".overflow-y-auto") as HTMLElement | null) ?? nav
      : nav;

    const containerTop = scrollContainer.scrollTop;
    const containerBottom = containerTop + scrollContainer.clientHeight;
    // offsetTop relative to scrollContainer
    const linkTop = link.getBoundingClientRect().top -
      scrollContainer.getBoundingClientRect().top +
      scrollContainer.scrollTop;
    const linkBottom = linkTop + link.offsetHeight;
    const padding = 12;

    if (linkTop < containerTop + padding) {
      scrollContainer.scrollTo({
        top: Math.max(0, linkTop - padding),
        behavior: "auto",
      });
    } else if (linkBottom > containerBottom - padding) {
      scrollContainer.scrollTo({
        top: Math.max(0, linkBottom - scrollContainer.clientHeight + padding),
        behavior: "auto",
      });
    }
  }, [activeId, isMobile]);

  if (headings.length === 0) return null;

  return (
    <aside
      className={cn(
        isMobile
          ? "block"
          : "hidden xl:block w-64 shrink-0 h-fit sticky top-28"
      )}
    >
      <div className={cn(!isMobile && "border-l-2 border-gray-100 pl-4 relative")}>
        {!isMobile && (
          <p className="text-[11px] font-bold uppercase text-muted-foreground/50 mb-4 tracking-widest">
            {t("onThisPage")}
          </p>
        )}

        <nav
          ref={navRef}
          className={cn(
            "flex flex-col gap-1 relative",
            // Desktop only: constrained height + scroll inside nav
            // Mobile: no overflow here — drawer's `overflow-y-auto` parent handles it
            !isMobile &&
              "pr-4 max-h-[calc(100vh-10rem)] overflow-y-auto scrollbar-hide"
          )}
        >
          {headings.map((h) => {
            const isActive = activeId === h.id;
            return (
              <a
                key={h.key}
                ref={(el) => {
                  if (el) linkRefs.current.set(h.id, el);
                  else linkRefs.current.delete(h.id);
                }}
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveId(h.id);
                  const el = document.getElementById(h.id);
                  if (el) {
                    const offset = 96;
                    const top =
                      el.getBoundingClientRect().top + window.scrollY - offset;
                    window.scrollTo({ top, behavior: "smooth" });
                  }
                  if (isMobile) onClose?.();
                }}
                className={cn(
                  "relative rounded-r-md text-[13px] py-1.5 pl-[18px] transition-colors duration-150",
                  isActive
                    ? "text-primary font-bold bg-primary/10"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-0 h-full w-0.5 rounded-full transition-colors duration-150",
                    isActive ? "bg-primary" : "bg-transparent"
                  )}
                />
                {h.text}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}