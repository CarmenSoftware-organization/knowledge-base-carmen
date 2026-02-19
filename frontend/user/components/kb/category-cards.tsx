'use client';

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { categoryDisplayMap } from "@/configs/sidebar-map";
import { motion, Variants } from "framer-motion";

type Props = {
  categories: {
    slug: string;
    articleCount: number;
  }[];
};

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    },
  },
};

export function CategoryCards({ categories }: Props) {
  return (
    <section className="py-16 bg-background overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header Animation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-foreground">
            เลือกหมวดหมู่
          </h2>
          <p className="mt-3 text-muted-foreground">
            เลือกหมวดหมู่ที่คุณต้องการเรียนรู้
          </p>
        </motion.div>

        {/* Grid Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {categories.map((category) => {
            const displayName = categoryDisplayMap[category.slug] || category.slug.replace(/-/g, " ");

            return (
              <motion.div
                key={category.slug}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }} 
              >
                <Link
                  href={`/categories/${category.slug}`}
                  className="group focus:outline-none block h-full"
                >
                  <Card
                    className="
                      h-full
                      border
                      bg-card/50
                      backdrop-blur-sm
                      transition-all duration-300
                      hover:shadow-xl
                      hover:border-primary/30
                      hover:bg-card
                      group-focus-visible:ring-2
                      group-focus-visible:ring-primary
                    "
                  >
                    <CardContent className="p-6 flex flex-col h-full justify-between">
                      {/* Category Title */}
                      <h3
                        className="
                          font-bold
                          text-foreground
                          capitalize
                          transition-colors
                          group-hover:text-primary
                          text-lg
                        "
                      >
                        {displayName}
                      </h3>

                      {/* Meta */}
                      <div className="mt-6 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                          {category.articleCount} บทความ
                        </span>

                        <div className="flex items-center gap-2 text-primary opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                          <span className="text-xs font-bold uppercase tracking-wider">ดูหมวดหมู่</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}