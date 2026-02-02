"use client";

import React from "react"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Settings,
  Users,
  HelpCircle,
  Zap,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Category {
  name: string;
  slug: string;
  icon: React.ReactNode;
  articles: { title: string; slug: string }[];
}

const categories: Category[] = [
  {
    name: "เริ่มต้นใช้งาน",
    slug: "getting-started",
    icon: <BookOpen className="h-4 w-4" />,
    articles: [
      { title: "แนะนำ Jupyter Chatbot", slug: "introduction" },
      { title: "การติดตั้งและตั้งค่าเบื้องต้น", slug: "installation" },
      { title: "คู่มือการใช้งานครั้งแรก", slug: "first-use" },
    ],
  },
  {
    name: "การจัดการระบบ",
    slug: "admin-guide",
    icon: <Settings className="h-4 w-4" />,
    articles: [
      { title: "การตั้งค่าผู้ดูแลระบบ", slug: "admin-setup" },
      { title: "การจัดการผู้ใช้งาน", slug: "user-management" },
      { title: "การปรับแต่งคำตอบ", slug: "customize-responses" },
    ],
  },
  {
    name: "การจัดการผู้ใช้",
    slug: "user-management",
    icon: <Users className="h-4 w-4" />,
    articles: [
      { title: "การเพิ่มผู้ใช้ใหม่", slug: "add-user" },
      { title: "การกำหนดสิทธิ์", slug: "permissions" },
      { title: "การลบผู้ใช้", slug: "remove-user" },
    ],
  },
  {
    name: "คำถามที่พบบ่อย",
    slug: "faq",
    icon: <HelpCircle className="h-4 w-4" />,
    articles: [
      { title: "ปัญหาการเข้าสู่ระบบ", slug: "login-issues" },
      { title: "Bot ไม่ตอบคำถาม", slug: "bot-not-responding" },
      { title: "การรีเซ็ตรหัสผ่าน", slug: "reset-password" },
    ],
  },
  {
    name: "ฟีเจอร์ขั้นสูง",
    slug: "advanced",
    icon: <Zap className="h-4 w-4" />,
    articles: [
      { title: "การเชื่อมต่อ API", slug: "api-integration" },
      { title: "Webhooks", slug: "webhooks" },
      { title: "การวิเคราะห์ข้อมูล", slug: "analytics" },
    ],
  },
  {
    name: "ความปลอดภัย",
    slug: "security",
    icon: <Shield className="h-4 w-4" />,
    articles: [
      { title: "นโยบายความปลอดภัย", slug: "security-policy" },
      { title: "การเข้ารหัสข้อมูล", slug: "encryption" },
      { title: "การสำรองข้อมูล", slug: "backup" },
    ],
  },
];

export function KBSidebar() {
  const pathname = usePathname();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "getting-started",
  ]);

  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <nav className="sticky top-20 space-y-1 pr-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
        {categories.map((category) => {
          const isExpanded = expandedCategories.includes(category.slug);
          const isActive = pathname.includes(`/categories/${category.slug}`);

          return (
            <div key={category.slug}>
              <button
                onClick={() => toggleCategory(category.slug)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                <span className="flex items-center gap-2">
                  {category.icon}
                  {category.name}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-4">
                  {category.articles.map((article) => {
                    const articlePath = `/categories/${category.slug}/${article.slug}`;
                    const isArticleActive = pathname === articlePath;

                    return (
                      <Link
                        key={article.slug}
                        href={articlePath}
                        className={cn(
                          "block px-3 py-1.5 text-sm rounded-md transition-colors",
                          isArticleActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                      >
                        {article.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export { categories };
