"use client";

import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const popularSearches = [
  "วิธีเริ่มต้นใช้งาน",
  "การตั้งค่าผู้ดูแล",
  "Bot ไม่ตอบ",
  "API Integration",
];

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-16 sm:py-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.border)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6">
          <Sparkles className="h-4 w-4" />
          <span>Jupyter Knowledge Base</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance">
          ศูนย์รวมความรู้
          <span className="block text-primary mt-2">สำหรับ Jupyter Chatbot</span>
        </h1>

        {/* Description */}
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          ค้นหาคู่มือ บทความ และคำตอบสำหรับทุกคำถามเกี่ยวกับการใช้งาน
          Jupyter Chatbot ระบบช่วยตอบคำถามอัจฉริยะขององค์กร
        </p>

        {/* Search Box */}
        <div className="mt-10 max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="ค้นหาบทความ, คู่มือ, หรือคำถาม..."
              className="h-14 pl-12 pr-32 text-base bg-card border-border shadow-lg rounded-2xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              size="lg"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl"
            >
              ค้นหา
            </Button>
          </div>

          {/* Popular Searches */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="text-sm text-muted-foreground">ยอดนิยม:</span>
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => setSearchQuery(term)}
                className="text-sm text-primary hover:underline"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div>
            <div className="text-3xl font-bold text-foreground">50+</div>
            <div className="text-sm text-muted-foreground">บทความ</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">6</div>
            <div className="text-sm text-muted-foreground">หมวดหมู่</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">24/7</div>
            <div className="text-sm text-muted-foreground">พร้อมช่วยเหลือ</div>
          </div>
        </div>
      </div>
    </section>
  );
}
