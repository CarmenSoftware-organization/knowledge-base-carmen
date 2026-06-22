"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, ArrowRight } from "lucide-react";
import type { FaqFolder } from "@/lib/faq-nav";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

type Props = {
  folders: FaqFolder[];
  pathPrefix: string[];
};

export function FaqFolderGrid({ folders, pathPrefix }: Props) {
  if (!folders.length) return null;

  const base = "/faq";
  const hrefFor = (slug: string) => {
    const segs = [...pathPrefix, slug].map((s) => encodeURIComponent(s)).join("/");
    return segs ? `${base}/${segs}` : base;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="grid gap-4 sm:grid-cols-2 mb-10"
    >
      {folders.map((folder) => (
        <motion.div key={folder.slug} variants={itemVariants}>
          <Link href={hrefFor(folder.slug)} className="group block h-full">
            <Card className="h-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/40 active:scale-[0.98]">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex-1 pr-4 min-w-0">
                  <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors leading-tight line-clamp-3">
                    {folder.title}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-2 text-primary/0 group-hover:text-primary transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      ดูหมวดย่อย
                    </span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
                <div className="shrink-0 w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                  <FolderOpen className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
