"use client";

import { motion, type Variants } from "framer-motion";
import { Sparkles } from "lucide-react";
import { GlobalSearch } from "@/components/search/global-search";
import { getBusinessUnits, getSelectedBUClient } from "@/lib/wiki-api";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const popularSearches = [
  "AP Invoice", "Input VAT Reconciliation", "AR Receipt",
  "Close Period", "Chart of Account", "Permissions",
];

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function HeroSection() {
  const t = useTranslations("hero");
  const [searchQuery, setSearchQuery] = useState("");
  const [buName, setBuName] = useState("Carmen Cloud");

  useEffect(() => {
    async function load() {
      try {
        const slug = getSelectedBUClient();
        const { items } = await getBusinessUnits();
        const found = items.find(b => b.slug === slug);
        if (found) setBuName(found.name);
      } catch (e) {}
    }
    load();

    const handleBUChange = () => load();
    window.addEventListener("bu-changed", handleBUChange);
    return () => window.removeEventListener("bu-changed", handleBUChange);
  }, []);

  const handlePopularClick = (term: string) => {
    setSearchQuery(term);
  };

  return (
    <motion.section
      className="relative bg-gradient-to-b from-primary/5 via-background to-background py-16 sm:py-24"
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.border)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"
        />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6"
        >
          <Sparkles className="h-4 w-4" />
          <span>{t("badge")}</span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance"
        >
          {t("title")}
          <span className="block text-primary mt-3">{t("titleFor", { buName })}</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          {t("subtitle", { buName })}
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 max-w-xl mx-auto relative">
         
          <GlobalSearch variant="hero" defaultValue={searchQuery} />

          <div className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-2">
            <span className="text-sm text-muted-foreground">{t("popular")}</span>
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => handlePopularClick(term)}
                className="text-sm px-2 py-0.5 text-primary/70 hover:text-primary transition-all hover:underline cursor-pointer active:scale-95 flex items-center"
              >
                {term}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}