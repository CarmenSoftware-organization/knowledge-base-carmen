"use client";

import { Sparkles } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { GlobalSearch } from "@/components/search/global-search";

const popularSearches = [
  "AP Invoice", "Input VAT Reconciliation", "AR Receipt",
  "Close Period", "Chart of Account", "User Permissions",
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
          <span>Knowledge Base</span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance"
        >
          ศูนย์รวมความรู้
          <span className="block text-primary mt-3">สำหรับ Carmen Cloud</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          ค้นหาคู่มือ บทความ และคำตอบสำหรับทุกคำถามเกี่ยวกับการใช้งาน Carmen Cloud ระบบบริหารจัดการบัญชี
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 max-w-xl mx-auto relative">
         
          <GlobalSearch variant="hero" />

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="text-sm text-muted-foreground">ยอดนิยม:</span>
            {popularSearches.map((term) => (
              <button
                key={term}
                className="text-sm px-2 py-0.5 text-primary/70 hover:text-primary transition-all hover:underline"
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