"use client";

import Link from "next/link";
import { Search, MessageCircle, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function KBHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <MessageCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-foreground">Carmen Software</span>
              <span className="ml-1.5 text-sm text-muted-foreground">
                Knowledge Base
              </span>
            </div>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ค้นหาบทความ, คู่มือ, หรือคำถามที่พบบ่อย..."
                className="w-full pl-10 pr-4 bg-secondary/50 border-border focus:bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">หน้าหลัก</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/categories">หมวดหมู่</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/articles/sample">บทความตัวอย่าง</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/chat">ถามบอท</Link>
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ค้นหา..."
                className="w-full pl-10 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <nav className="flex flex-col gap-1">
              <Button
                variant="ghost"
                className="justify-start"
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/">หน้าหลัก</Link>
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/categories">หมวดหมู่</Link>
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/articles/sample">บทความตัวอย่าง</Link>
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/chat">ถามบอท</Link>
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
