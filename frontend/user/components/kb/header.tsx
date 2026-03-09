"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { GlobalSearch } from "@/components/search/global-search";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "next-themes";
import { BUSwitcher } from "./bu-switcher";

const headerVariants: Variants = {
  hidden: { y: -60, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
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
  const pathname = usePathname();
  const isHome = pathname === "/";

  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
   
  const logoSrc = mounted && resolvedTheme === "dark"
    ? "/carmen-logo-light.png"
    : "/carmen02-logo.png";

  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate="show"
      className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur shadow-sm"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image
              src={logoSrc}
              alt="Carmen Logo"
              width={170}
              height={170}
              className="rounded transition-all duration-300"
              priority
            />
          </Link>

          {!isHome && (
            <div className="hidden md:flex flex-1 max-w-2xl mx-4">
              <GlobalSearch variant="header" />
            </div>
          )}

          <div className="flex items-center gap-1">

            <nav className="hidden md:flex items-center gap-1 mr-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">หน้าหลัก</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/categories">หมวดหมู่</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/activity">สำหรับเจ้าหน้าที่</Link>
              </Button>
            </nav>
            <div className="hidden md:block">
              <BUSwitcher />
            </div>
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="md:hidden border-t border-border py-4 space-y-4 px-2"
            >
              {!isHome && (
                <div className="pb-2">
                  <GlobalSearch variant="header" placeholder="ค้นหาคู่มือหรือเนื้อหา..." />
                </div>
              )}
              <nav className="flex flex-col gap-1">
                <Button variant="ghost" className="justify-start h-12 rounded-xl" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link href="/">หน้าหลัก</Link>
                </Button>
                <Button variant="ghost" className="justify-start h-12 rounded-xl" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link href="/categories">หมวดหมู่</Link>
                </Button>
                <div className="px-3">
                  <BUSwitcher />
                </div>
                <ThemeToggle />
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}