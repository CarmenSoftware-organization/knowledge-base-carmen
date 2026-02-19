'use client';

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { articleDisplayMap, cleanTitle } from "@/configs/sidebar-map";
import { ArrowRight } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 } 
  }
};

export function ArticleGridTransition({ items, category }: { items: any[], category: string }) {
  
  const filteredItems = items.filter(item => item.slug !== 'index');

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="grid gap-4 sm:grid-cols-2 mb-10"
    >
      {filteredItems.map((item: any) => {
        const displayTitle = articleDisplayMap[item.slug] || cleanTitle(item.title);
        
        return (
          <motion.div key={item.path} variants={itemVariants}>
            <Link href={`/categories/${category}/${item.slug}`} className="group block h-full">
              <Card className="h-full border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/40 active:scale-[0.98]">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <h2 className="font-bold text-base text-slate-800 group-hover:text-primary transition-colors leading-tight line-clamp-2">
                      {displayTitle}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-2 text-primary/0 group-hover:text-primary transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                       <span className="text-[10px] font-bold uppercase tracking-wider">อ่านบทความ</span>
                       <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                  
                  <div className="shrink-0 w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}