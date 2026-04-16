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
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <p className="text-lg font-semibold text-foreground">{t("emptyList")}</p>
        <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full"
    >
      {visible.map((c: { slug: string }) => {
        const color = getCategoryColor(c.slug);
        const displayName = categoryDisplayMap[c.slug] || c.slug.toUpperCase();

        return (
          <motion.div key={c.slug} variants={itemVariants}>
            <Link href={`/categories/${c.slug}`} className="block h-full group">
              
              <Card
                className={`
                  h-full border-l-4 ${color.split(" ")[2]}
                  bg-card border border-border
                  shadow-sm
                  transition-all duration-300
                  group-hover:shadow-lg
                  group-hover:-translate-y-1
                `}
              >
                <CardHeader className="flex flex-row items-center justify-between p-5">

                  <div className="flex items-center gap-4">
                    <div
                      className={`
                        p-3 rounded-2xl
                        ${color}
                        group-hover:scale-110
                        transition-transform duration-300
                        shadow-inner
                      `}
                    >
                      <Folder className="h-6 w-6" />
                    </div>

                    <CardTitle className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {displayName}
                    </CardTitle>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />

                </CardHeader>
              </Card>

            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}