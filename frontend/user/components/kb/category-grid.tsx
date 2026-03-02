'use client';

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Folder, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoryColor } from "@/lib/wiki-utils";
import { categoryDisplayMap } from "@/configs/sidebar-map";

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
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full"
    >
      {items.map((c: { slug: string }) => {
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