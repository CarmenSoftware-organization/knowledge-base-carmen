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
  SearchResultItem 
} from "@/lib/wiki-api";

/* --- 1. Helper HTML/Markdown --- */
function cleanSnippet(text: string) {
  if (!text) return "";
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
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
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

/* --- 3. Main Component --- */
interface GlobalSearchProps {
  variant?: "hero" | "header";
  placeholder?: string;
  className?: string;
}

export function GlobalSearch({ variant = "hero", placeholder, className }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isHeader = variant === "header";

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
        const results = await searchWiki(q);
        const filtered = results.filter(item => {
          const isIndex = item.path.endsWith('/index') || item.path === 'index';
          return !isIndex && cleanSnippet(item.snippet).length > 0;
        });
        setSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
        setActiveIndex(-1);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelect = useCallback((item: SearchResultItem) => {
    router.push(wikiPathToRoute(item.path));
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
      const { route } = await findBestArticleForQuery(searchQuery);
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
            className={`transition-all ${
              isHeader 
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
                    key={item.path}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full flex flex-col items-start p-3 rounded-lg mb-1 last:mb-0 transition-all ${
                      index === activeIndex ? "bg-primary/10" : "hover:bg-muted"
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
                      <p className={`mt-1 text-muted-foreground/80 line-clamp-2 pl-6 text-left leading-relaxed w-full ${
                        isHeader ? "text-[11px]" : "text-xs"
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