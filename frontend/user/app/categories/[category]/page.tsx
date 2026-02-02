import React from "react"
import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import Link from "next/link";
import {
  BookOpen,
  Settings,
  Users,
  HelpCircle,
  Zap,
  Shield,
  Clock,
  Eye,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

// Category data
const categoriesData: Record<
  string,
  {
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    articles: {
      title: string;
      slug: string;
      description: string;
      readTime: string;
      views: number;
      isNew?: boolean;
    }[];
  }
> = {
  "getting-started": {
    name: "เริ่มต้นใช้งาน",
    description:
      "คู่มือสำหรับผู้เริ่มต้นใช้งาน Jupyter Chatbot ตั้งแต่การติดตั้งไปจนถึงการใช้งานครั้งแรก",
    icon: BookOpen,
    color: "bg-blue-500/10 text-blue-600",
    articles: [
      {
        title: "แนะนำ Jupyter Chatbot - เริ่มต้นใช้งานอย่างง่าย",
        slug: "introduction",
        description:
          "เรียนรู้พื้นฐานการใช้งาน Jupyter Chatbot ตั้งแต่การเข้าสู่ระบบไปจนถึงการถามคำถามแรก",
        readTime: "5 นาที",
        views: 1250,
        isNew: true,
      },
      {
        title: "การติดตั้งและตั้งค่าเบื้องต้น",
        slug: "installation",
        description:
          "ขั้นตอนการติดตั้ง Jupyter Chatbot สำหรับองค์กรของคุณ พร้อมการตั้งค่าเบื้องต้น",
        readTime: "8 นาที",
        views: 890,
      },
      {
        title: "คู่มือการใช้งานครั้งแรก",
        slug: "first-use",
        description:
          "แนวทางการใช้งาน Jupyter ครั้งแรก พร้อมเคล็ดลับสำหรับมือใหม่",
        readTime: "6 นาที",
        views: 750,
      },
      {
        title: "การตั้งค่าโปรไฟล์ผู้ใช้",
        slug: "user-profile",
        description: "วิธีการตั้งค่าและปรับแต่งโปรไฟล์ผู้ใช้ของคุณ",
        readTime: "4 นาที",
        views: 420,
      },
      {
        title: "ทำความรู้จักกับหน้าจอหลัก",
        slug: "main-interface",
        description:
          "อธิบายส่วนประกอบต่างๆ ของหน้าจอหลักและการใช้งานแต่ละส่วน",
        readTime: "5 นาที",
        views: 380,
      },
    ],
  },
  "admin-guide": {
    name: "การจัดการระบบ",
    description:
      "ตั้งค่าและจัดการระบบสำหรับผู้ดูแล รวมถึงการปรับแต่งคำตอบและการตั้งค่าขั้นสูง",
    icon: Settings,
    color: "bg-violet-500/10 text-violet-600",
    articles: [
      {
        title: "การตั้งค่าผู้ดูแลระบบ",
        slug: "admin-setup",
        description: "คู่มือการตั้งค่าและกำหนดสิทธิ์สำหรับผู้ดูแลระบบ",
        readTime: "8 นาที",
        views: 650,
      },
      {
        title: "การจัดการผู้ใช้งาน",
        slug: "user-management",
        description: "วิธีการเพิ่ม ลบ และจัดการผู้ใช้งานในระบบ",
        readTime: "10 นาที",
        views: 520,
      },
      {
        title: "การปรับแต่งคำตอบ",
        slug: "customize-responses",
        description:
          "เรียนรู้วิธีการปรับแต่งคำตอบของ Bot ให้เหมาะกับองค์กร",
        readTime: "12 นาที",
        views: 480,
        isNew: true,
      },
    ],
  },
  "user-management": {
    name: "การจัดการผู้ใช้",
    description:
      "เพิ่ม ลบ และจัดการสิทธิ์ผู้ใช้งานในระบบ รวมถึงการกำหนด Role และ Permission",
    icon: Users,
    color: "bg-emerald-500/10 text-emerald-600",
    articles: [
      {
        title: "การเพิ่มผู้ใช้ใหม่",
        slug: "add-user",
        description: "ขั้นตอนการเพิ่มผู้ใช้ใหม่เข้าสู่ระบบ",
        readTime: "5 นาที",
        views: 420,
      },
      {
        title: "การกำหนดสิทธิ์",
        slug: "permissions",
        description: "วิธีการกำหนด Role และ Permission ให้ผู้ใช้",
        readTime: "7 นาที",
        views: 380,
      },
      {
        title: "การลบผู้ใช้",
        slug: "remove-user",
        description: "ขั้นตอนการลบผู้ใช้ออกจากระบบ",
        readTime: "4 นาที",
        views: 290,
      },
    ],
  },
  faq: {
    name: "คำถามที่พบบ่อย",
    description:
      "คำตอบสำหรับปัญหาที่พบบ่อย รวมถึงวิธีแก้ไขปัญหาเบื้องต้นด้วยตัวเอง",
    icon: HelpCircle,
    color: "bg-amber-500/10 text-amber-600",
    articles: [
      {
        title: "ปัญหาการเข้าสู่ระบบ",
        slug: "login-issues",
        description: "แก้ไขปัญหาเมื่อไม่สามารถเข้าสู่ระบบได้",
        readTime: "4 นาที",
        views: 1800,
      },
      {
        title: "Bot ไม่ตอบคำถาม - วิธีแก้ไข",
        slug: "bot-not-responding",
        description: "รวมวิธีแก้ไขปัญหาเมื่อ Bot ไม่ตอบคำถาม",
        readTime: "4 นาที",
        views: 2100,
      },
      {
        title: "การรีเซ็ตรหัสผ่าน",
        slug: "reset-password",
        description: "ขั้นตอนการรีเซ็ตรหัสผ่านเมื่อลืม",
        readTime: "3 นาที",
        views: 1500,
      },
    ],
  },
  advanced: {
    name: "ฟีเจอร์ขั้นสูง",
    description:
      "การใช้งาน API, Webhooks และการวิเคราะห์ข้อมูลสำหรับผู้ใช้งานขั้นสูง",
    icon: Zap,
    color: "bg-rose-500/10 text-rose-600",
    articles: [
      {
        title: "การเชื่อมต่อ API",
        slug: "api-integration",
        description:
          "เรียนรู้การใช้ API เพื่อเชื่อมต่อ Jupyter กับระบบอื่นๆ",
        readTime: "12 นาที",
        views: 650,
        isNew: true,
      },
      {
        title: "Webhooks",
        slug: "webhooks",
        description: "การตั้งค่า Webhooks เพื่อรับการแจ้งเตือน",
        readTime: "8 นาที",
        views: 420,
      },
      {
        title: "การวิเคราะห์ข้อมูล",
        slug: "analytics",
        description: "ใช้ Analytics Dashboard เพื่อวิเคราะห์การใช้งาน",
        readTime: "10 นาที",
        views: 380,
      },
    ],
  },
  security: {
    name: "ความปลอดภัย",
    description:
      "นโยบายและมาตรการด้านความปลอดภัย การเข้ารหัสข้อมูล และการสำรองข้อมูล",
    icon: Shield,
    color: "bg-cyan-500/10 text-cyan-600",
    articles: [
      {
        title: "นโยบายความปลอดภัย",
        slug: "security-policy",
        description: "นโยบายความปลอดภัยของ Jupyter Chatbot",
        readTime: "6 นาที",
        views: 320,
      },
      {
        title: "การเข้ารหัสข้อมูล",
        slug: "encryption",
        description: "วิธีการเข้ารหัสข้อมูลในระบบ",
        readTime: "8 นาที",
        views: 280,
      },
      {
        title: "การสำรองข้อมูล",
        slug: "backup",
        description: "ขั้นตอนการสำรองและกู้คืนข้อมูล",
        readTime: "5 นาที",
        views: 250,
      },
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = categoriesData[categorySlug];

  if (!category) {
    return {
      title: "ไม่พบหมวดหมู่ - Jupyter Knowledge Base",
    };
  }

  return {
    title: `${category.name} - Jupyter Knowledge Base`,
    description: category.description,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const category = categoriesData[categorySlug];

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col">
        <KBHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              ไม่พบหมวดหมู่
            </h1>
            <p className="mt-2 text-muted-foreground">
              หมวดหมู่ที่คุณกำลังค้นหาไม่มีอยู่ในระบบ
            </p>
            <Link
              href="/categories"
              className="mt-4 inline-flex items-center gap-1 text-primary hover:underline"
            >
              กลับไปหน้าหมวดหมู่
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
        <KBFooter />
      </div>
    );
  }

  const Icon = category.icon;

  return (
    <div className="min-h-screen flex flex-col">
      <KBHeader />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            <KBSidebar />

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Breadcrumb */}
              <Breadcrumb
                items={[
                  { label: "หมวดหมู่", href: "/categories" },
                  { label: category.name },
                ]}
              />

              {/* Category Header */}
              <header className="mt-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 rounded-xl p-4 ${category.color}`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">
                      {category.name}
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                      {category.description}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {category.articles.length} บทความ
                    </p>
                  </div>
                </div>
              </header>

              {/* Articles List */}
              <div className="space-y-4">
                {category.articles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/categories/${categorySlug}/${article.slug}`}
                  >
                    <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/30 group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {article.isNew && (
                                <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                                  ใหม่
                                </Badge>
                              )}
                            </div>
                            <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                              {article.title}
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                              {article.description}
                            </p>
                            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {article.readTime}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                {article.views.toLocaleString()} views
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <KBFooter />
    </div>
  );
}
