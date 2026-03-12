"use client";

import { Search, Loader2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { articleDisplayMap, cleanTitle } from "@/configs/sidebar-map";
import {
  searchWiki,
  wikiPathToRoute,
  findBestArticleForQuery,
  SearchResultItem,
  getSelectedBUClient,
  getAllArticles
} from "@/lib/wiki-api";
import Fuse from "fuse.js";

/* --- 1. Helper HTML/Markdown --- */
function cleanSnippet(text: string) {
  if (!text) return "";
  text = text.replace(/^---[\s\S]*?---/, "");

  return text
    .replace(/(\/public\/[^\s'"]+\.(png|jpg|jpeg|gif|svg|webp))/gi, "")
    .replace(/[^\s'"]+\.(png|jpg|jpeg|gif|svg|webp)/gi, "")
    .replace(/(=?['"][^'"]+\.(png|jpg|jpeg|gif|svg|webp)['"]\s*\/?>)/gi, "")
    .replace(/<img[^>]*>?/gi, "")
    .replace(/(\/?>)/g, "")
    .replace(/[a-z0-9-]+\s*=\s*['"][^'"]*['"]/gi, "")
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/[#*`_~]/g, "")
    .replace(/\uFFFD/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* --- 2. Component Highlight Search --- */
function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const safeQuery = escapeRegExp(query);
  const parts = text.split(new RegExp(`(${safeQuery})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function normalizeThai(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/(\p{L})\.(?=\p{L})/gu, "$1") // ภ.ง.ด. → ภงด
    .replace(/\.$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* --- 3. Main Component --- */
interface GlobalSearchProps {
  variant?: "hero" | "header";
  placeholder?: string;
  className?: string;
  defaultValue?: string;
}

export function GlobalSearch({ variant = "hero", placeholder, className, defaultValue = "" }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState(defaultValue);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [bu, setBu] = useState(getSelectedBUClient());

  useEffect(() => {
    const handleBUChange = () => setBu(getSelectedBUClient());
    window.addEventListener("bu-changed", handleBUChange);
    return () => window.removeEventListener("bu-changed", handleBUChange);
  }, []);

  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isHeader = variant === "header";

  useEffect(() => {
    if (defaultValue) {
      setSearchQuery(defaultValue);
    }
  }, [defaultValue]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // 1. Vector search
        const results = await searchWiki(q, bu);

        // 2. Fuzzy search บน title list (สำหรับ typo)
        const allItems = await getAllArticles(bu);
        // ✅ ใหม่ — Thai-aware
        const isThaiQuery = /[\u0E00-\u0E7F]/.test(q);

        const fuse = new Fuse(allItems, {
          keys: [
            { name: "title", weight: 0.8 },
            { name: "description", weight: 0.2 },
          ],
          threshold: isThaiQuery ? 0.3 : 0.45,
          ignoreLocation: true,
          minMatchCharLength: isThaiQuery ? 1 : 2,
          useExtendedSearch: true,
          getFn: (obj, path) => {
            const val = Fuse.config.getFn(obj, path);
            if (typeof val === "string") return normalizeThai(val); // ✅ normalize title ด้วย
            if (Array.isArray(val)) return val.map(v =>
              typeof v === "string" ? normalizeThai(v) : v
            );
            return val;
          },
        });

        const normalizedQ = normalizeThai(q); 
        const fuzzyHits = fuse.search(normalizedQ).map((r) => ({
          ...r.item,
          snippet: r.item.description || "",
        }));

        // 3. Merge: vector results ก่อน, fuzzy เติมถ้าไม่ซ้ำ path
        const existingPaths = new Set(results.map((r) => r.path.replace(/\\/g, "/")));
        const merged = [
          ...results,
          ...fuzzyHits.filter((r) => !existingPaths.has(r.path.replace(/\\/g, "/"))),
        ];

        const filtered = Array.from(
          new Map(
            merged
              .map((item) => ({ ...item, path: item.path.replace(/\\/g, "/") }))
              .filter((item) => {
                const isIndex = item.path.endsWith("/index") || item.path === "index";
                return !isIndex && (cleanSnippet(item.snippet).length > 0 || item.title);
              })
              .map((item) => [item.path, item])
          ).values()
        );

        setSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
        setActiveIndex(-1);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, bu]);

  const handleSelect = useCallback((item: SearchResultItem) => {
    router.push(wikiPathToRoute(item.path.replace(/\\/g, "/")));
    setShowDropdown(false);
    setSearchQuery("");
  }, [router]);

  const onSearchSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      handleSelect(suggestions[activeIndex]);
      return;
    }
    setIsSearching(true);
    try {
      const { route } = await findBestArticleForQuery(searchQuery, bu);
      router.push(route || "/categories");
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <form onSubmit={onSearchSubmit} className="relative z-30">
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </div>
          <Input
            type="search"
            placeholder={placeholder || (isHeader ? "ค้นหาคู่มือ..." : "ค้นหาชื่อคู่มือ หรือเนื้อหาภายใน...")}
            className={`transition-all ${isHeader
              ? "h-10 pl-9 pr-4 text-sm bg-muted/50 focus:bg-card"
              : "h-14 pl-12 pr-24 text-base shadow-xl rounded-2xl"
              }`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActiveIndex(p => (p < suggestions.length - 1 ? p + 1 : p));
              if (e.key === "ArrowUp") setActiveIndex(p => (p > 0 ? p - 1 : 0));
              if (e.key === "Enter" && activeIndex >= 0) handleSelect(suggestions[activeIndex]);
              if (e.key === "Escape") setShowDropdown(false);
            }}
          />
          {!isHeader && (
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-5 py-1.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              ค้นหา
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            className="absolute z-50 mt-2 w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden text-left"
          >
            <div className="max-h-[400px] overflow-y-auto p-2 scrollbar-thin">
              {suggestions.map((item, index) => {
                const itemSlug = item.path.split('/').pop() || "";
                const displayTitle = articleDisplayMap[itemSlug] || cleanTitle(item.title);
                const desc = cleanSnippet(item.snippet);

                return (
                  <button
                    key={`${item.path}-${index}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full flex flex-col items-start p-3 rounded-lg mb-1 last:mb-0 transition-all ${index === activeIndex ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                  >
                    {/* Header: Icon + Title */}
                    <div className="flex items-center gap-2 w-full">
                      <FileText className={`h-4 w-4 shrink-0 ${index === activeIndex ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`font-semibold text-foreground truncate ${isHeader ? "text-[13px]" : "text-sm"}`}>
                        <HighlightedText text={displayTitle} query={searchQuery} />
                      </span>
                    </div>

                    {/* Content Snippet */}
                    {desc && (
                      <p className={`mt-1 text-muted-foreground/80 line-clamp-2 pl-6 text-left leading-relaxed w-full ${isHeader ? "text-[11px]" : "text-xs"
                        }`}>
                        <HighlightedText text={desc} query={searchQuery} />
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="bg-muted/50 px-3 py-1.5 border-t border-border/50 flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-tight">Search Results</span>
              <span className="text-[10px] text-muted-foreground">↑↓ to navigate</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}