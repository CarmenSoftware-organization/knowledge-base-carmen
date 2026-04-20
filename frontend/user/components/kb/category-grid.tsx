'use client';

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Folder, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoryColor } from "@/lib/wiki-utils";
import { categoryDisplayMap } from "@/configs/sidebar-map";
import { useTranslations } from "next-intl";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

export function CategoryGrid({ items }: { items: any[] }) {
  const t = useTranslations("category");
  const visible = items.filter(
    (c: { slug: string }) => c.slug !== "changelog" && c.slug !== "faq"
  );

  if (visible.length === 0) {
    return (
      <div className="rounded-xl sm:rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 sm:px-6 sm:py-14 text-center">
        <p className="text-base sm:text-lg font-semibold text-foreground">{t("emptyList")}</p>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          {t("emptyListHint")}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 w-full"
    >
      {visible.map((c: { slug: string }) => {
        const color = getCategoryColor(c.slug);
        const displayName = categoryDisplayMap[c.slug] || c.slug.toUpperCase();

        return (
          <motion.div key={c.slug} variants={itemVariants}>
            <Link href={`/categories/${c.slug}`} className="block h-full group">
              
              <Card
                className={`
                  h-full border-l-[3px] sm:border-l-4 ${color.split(" ")[2]}
                  bg-card border border-border
                  shadow-sm
                  transition-all duration-300
                  sm:group-hover:shadow-lg
                  sm:group-hover:-translate-y-1
                `}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2 p-3.5 sm:p-4 md:p-5">

                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 md:gap-4">
                    <div
                      className={`
                        shrink-0 p-2 rounded-xl sm:p-3 sm:rounded-2xl
                        ${color}
                        sm:group-hover:scale-110
                        transition-transform duration-300
                        shadow-inner
                      `}
                    >
                      <Folder className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                    </div>

                    <CardTitle className="min-w-0 line-clamp-2 text-[0.9375rem] font-bold leading-snug tracking-tight text-foreground sm:text-base md:text-lg group-hover:text-primary transition-colors">
                      {displayName}
                    </CardTitle>
                  </div>

                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground group-hover:text-primary sm:group-hover:translate-x-1 transition-all" />

                </CardHeader>
              </Card>

            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}