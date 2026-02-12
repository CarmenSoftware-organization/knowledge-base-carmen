"use client";

import Link from "next/link";
import { Search, MessageCircle, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";

import {
  findBestArticleForQuery,
  getAllArticles,
  wikiPathToRoute,
} from "@/lib/wiki-api";

/* =============================
   Animation
============================= */

const headerVariants: Variants = {
  hidden: { y: -60, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25 },
  },
  exit: {
    opacity: 0,
    y: -5,
    transition: { duration: 0.15 },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [articles, setArticles] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  const isHome = pathname === "/";

  /* =============================
     Load Articles Once
  ============================== */
  useEffect(() => {
    getAllArticles().then(setArticles);
  }, []);

  /* =============================
     Debounced Suggestion
  ============================== */
  useEffect(() => {
    const handler = setTimeout(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) {
        setSuggestions([]);
        return;
      }

      const filtered = articles
        .filter((a) => a.title.toLowerCase().includes(q))
        .slice(0, 5);

      setSuggestions(filtered);
      setActiveIndex(-1);
    }, 200);

    return () => clearTimeout(handler);
  }, [searchQuery, articles]);

  /* =============================
     Submit Search
  ============================== */
  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    try {
      const { route } = await findBestArticleForQuery(q);
      if (route) router.push(route);
      else router.push("/categories");

      setSearchQuery("");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(item: any) {
    router.push(wikiPathToRoute(item.path));
    setSearchQuery("");
    setSuggestions([]);
  }

  /* =============================
     Keyboard Nav
  ============================== */
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : 0
      );
    }

    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    }
  }

  /* =============================
     Cmd+K Shortcut
  ============================== */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate="show"
      className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <MessageCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              Carmen Software
            </span>
          </Link>

          {/* Desktop Search (Hide on Home) */}
          {!isHome && (
            <div className="hidden md:flex flex-1 max-w-xl mx-4 relative">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    type="search"
                    placeholder="ค้นหา AP, AR, Configuration..."
                    className="w-full pl-10 pr-4"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </form>

              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    {suggestions.map((item, index) => (
                      <button
                        key={item.path}
                        onClick={() => handleSelect(item)}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                          index === activeIndex
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">หน้าหลัก</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/categories">หมวดหมู่</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/chat">ถามบอท</Link>
            </Button>
          </nav>

          {/* Mobile Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="md:hidden border-t border-border py-4 space-y-4"
            >
              {!isHome && (
                <form onSubmit={handleSearch}>
                  <Input
                    type="search"
                    placeholder="ค้นหา..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
              )}

              <nav className="flex flex-col gap-1">
                <Link href="/">หน้าหลัก</Link>
                <Link href="/categories">หมวดหมู่</Link>
<<<<<<< HEAD
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
=======
>>>>>>> 2cafdac7458f5d6b245fd11701aee516793f2662
                <Link href="/chat">ถามบอท</Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
