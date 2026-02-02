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
  ArrowRight,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "หมวดหมู่ทั้งหมด - Jupyter Knowledge Base",
  description: "เรียกดูหมวดหมู่บทความทั้งหมดใน Jupyter Knowledge Base",
};

const categories = [
  {
    name: "เริ่มต้นใช้งาน",
    description:
      "คู่มือสำหรับผู้เริ่มต้นใช้งาน Jupyter Chatbot ตั้งแต่การติดตั้งไปจนถึงการใช้งานครั้งแรก",
    icon: BookOpen,
    slug: "getting-started",
    articles: [
      {
        title: "แนะนำ Jupyter Chatbot",
        slug: "introduction",
        views: 1250,
      },
      {
        title: "การติดตั้งและตั้งค่าเบื้องต้น",
        slug: "installation",
        views: 890,
      },
      {
        title: "คู่มือการใช้งานครั้งแรก",
        slug: "first-use",
        views: 750,
      },
    ],
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    name: "การจัดการระบบ",
    description:
      "ตั้งค่าและจัดการระบบสำหรับผู้ดูแล รวมถึงการปรับแต่งคำตอบและการตั้งค่าขั้นสูง",
    icon: Settings,
    slug: "admin-guide",
    articles: [
      { title: "การตั้งค่าผู้ดูแลระบบ", slug: "admin-setup", views: 650 },
      { title: "การจัดการผู้ใช้งาน", slug: "user-management", views: 520 },
      { title: "การปรับแต่งคำตอบ", slug: "customize-responses", views: 480 },
    ],
    color: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  },
  {
    name: "การจัดการผู้ใช้",
    description:
      "เพิ่ม ลบ และจัดการสิทธิ์ผู้ใช้งานในระบบ รวมถึงการกำหนด Role และ Permission",
    icon: Users,
    slug: "user-management",
    articles: [
      { title: "การเพิ่มผู้ใช้ใหม่", slug: "add-user", views: 420 },
      { title: "การกำหนดสิทธิ์", slug: "permissions", views: 380 },
      { title: "การลบผู้ใช้", slug: "remove-user", views: 290 },
    ],
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  {
    name: "คำถามที่พบบ่อย",
    description:
      "คำตอบสำหรับปัญหาที่พบบ่อย รวมถึงวิธีแก้ไขปัญหาเบื้องต้นด้วยตัวเอง",
    icon: HelpCircle,
    slug: "faq",
    articles: [
      { title: "ปัญหาการเข้าสู่ระบบ", slug: "login-issues", views: 1800 },
      { title: "Bot ไม่ตอบคำถาม", slug: "bot-not-responding", views: 2100 },
      { title: "การรีเซ็ตรหัสผ่าน", slug: "reset-password", views: 1500 },
    ],
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  {
    name: "ฟีเจอร์ขั้นสูง",
    description:
      "การใช้งาน API, Webhooks และการวิเคราะห์ข้อมูลสำหรับผู้ใช้งานขั้นสูง",
    icon: Zap,
    slug: "advanced",
    articles: [
      { title: "การเชื่อมต่อ API", slug: "api-integration", views: 650 },
      { title: "Webhooks", slug: "webhooks", views: 420 },
      { title: "การวิเคราะห์ข้อมูล", slug: "analytics", views: 380 },
    ],
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
  {
    name: "ความปลอดภัย",
    description:
      "นโยบายและมาตรการด้านความปลอดภัย การเข้ารหัสข้อมูล และการสำรองข้อมูล",
    icon: Shield,
    slug: "security",
    articles: [
      { title: "นโยบายความปลอดภัย", slug: "security-policy", views: 320 },
      { title: "การเข้ารหัสข้อมูล", slug: "encryption", views: 280 },
      { title: "การสำรองข้อมูล", slug: "backup", views: 250 },
    ],
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
];

export default function CategoriesPage() {
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
              <Breadcrumb items={[{ label: "หมวดหมู่ทั้งหมด" }]} />

              {/* Page Header */}
              <header className="mt-6 mb-8">
                <h1 className="text-3xl font-bold text-foreground">
                  หมวดหมู่ทั้งหมด
                </h1>
                <p className="mt-2 text-muted-foreground">
                  เลือกหมวดหมู่เพื่อดูบทความและคู่มือที่เกี่ยวข้อง
                </p>
              </header>

              {/* Categories Grid */}
              <div className="space-y-8">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Card
                      key={category.slug}
                      className={`border-l-4 ${category.color.split(" ")[2]}`}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div
                            className={`shrink-0 rounded-xl p-3 ${category.color.split(" ").slice(0, 2).join(" ")}`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <Link
                              href={`/categories/${category.slug}`}
                              className="group"
                            >
                              <CardTitle className="text-xl group-hover:text-primary transition-colors flex items-center gap-2">
                                {category.name}
                                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                              </CardTitle>
                            </Link>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {category.articles.map((article) => (
                            <Link
                              key={article.slug}
                              href={`/categories/${category.slug}/${article.slug}`}
                              className="group flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                            >
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                  {article.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {article.views.toLocaleString()} views
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <Link
                          href={`/categories/${category.slug}`}
                          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          ดูบทความทั้งหมดในหมวดนี้
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
      <KBFooter />
    </div>
  );
}
