"use client";

import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";

import {
  findBestArticleForQuery,
  getAllArticles,
  wikiPathToRoute,
} from "@/lib/wiki-api";

/* =============================
   Popular Searches (ERP Context)
============================= */
const popularSearches = [
  "AP Invoice",
  "Input VAT Reconciliation",
  "AR Receipt",
  "Close Period",
  "Chart of Account",
  "User Permissions",
];

/* =============================
   Animation Variants
============================= */

const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [articles, setArticles] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const router = useRouter();

  /* =============================
     Load Articles Once
  ============================== */
  useEffect(() => {
    async function loadArticles() {
      try {
        const list = await getAllArticles();
        setArticles(list);
      } catch (err) {
        console.error("Failed to load articles:", err);
      }
    }
    loadArticles();
  }, []);

  /* =============================
     Auto Suggest
  ============================== */
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const filtered = articles
      .filter((a) => a.title.toLowerCase().includes(q))
      .slice(0, 5);

    setSuggestions(filtered);
    setActiveIndex(-1);
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
      if (route) {
        router.push(route);
      } else {
        router.push("/categories");
      }
    } finally {
      setLoading(false);
    }
  }

  /* =============================
     Select Suggestion
  ============================== */
  function handleSelect(item: any) {
    router.push(wikiPathToRoute(item.path));
    setSuggestions([]);
    setSearchQuery("");
  }

  /* =============================
     Keyboard Navigation
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
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    }

    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    }
  }

  return (
    <motion.section
      className="relative bg-gradient-to-b from-primary/5 via-background to-background py-16 sm:py-24"
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.border)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"
        />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6"
        >
          <Sparkles className="h-4 w-4" />
          <span>Carmen Cloud</span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={fadeUp}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance"
        >
          ศูนย์รวมความรู้
          <span className="block text-primary mt-3">
            สำหรับ Carmen Cloud
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={fadeUp}
          className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          ค้นหาคู่มือ บทความ และคำตอบสำหรับทุกคำถามเกี่ยวกับการใช้งาน
          Carmen Cloud ระบบบริหารจัดการทางบัญชีขององค์กร
        </motion.p>

        {/* Search Box */}
        <motion.div
          variants={fadeUp}
          className="mt-10 max-w-xl mx-auto"
        >
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="search"
                placeholder="ค้นหา AP, AR, Configuration..."
                className="h-14 pl-12 pr-32 text-base bg-card border-border shadow-lg rounded-2xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              <Button
                type="submit"
                size="lg"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl"
                disabled={loading}
              >
                {loading ? "กำลังค้นหา..." : "ค้นหา"}
              </Button>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="absolute z-50 mt-2 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  {suggestions.map((item, index) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`
                        w-full text-left px-4 py-3 text-sm
                        transition-colors
                        ${index === activeIndex
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                        }
                      `}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          {/* Popular Searches */}
          <motion.div
            variants={fadeUp}
            className="mt-4 flex flex-wrap justify-center gap-2"
          >
            <span className="text-sm text-muted-foreground">
              ยอดนิยม:
            </span>
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => setSearchQuery(term)}
                className="text-sm text-primary hover:underline"
              >
                {term}
              </button>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
