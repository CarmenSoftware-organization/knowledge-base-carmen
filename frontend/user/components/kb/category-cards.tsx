import Link from "next/link";
import {
  BookOpen,
  Settings,
  Users,
  HelpCircle,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const categories = [
  {
    name: "เริ่มต้นใช้งาน",
    description: "คู่มือสำหรับผู้เริ่มต้นใช้งาน Jupyter Chatbot",
    icon: BookOpen,
    slug: "getting-started",
    articleCount: 5,
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    name: "การจัดการระบบ",
    description: "ตั้งค่าและจัดการระบบสำหรับผู้ดูแล",
    icon: Settings,
    slug: "admin-guide",
    articleCount: 8,
    color: "bg-violet-500/10 text-violet-600",
  },
  {
    name: "การจัดการผู้ใช้",
    description: "เพิ่ม ลบ และจัดการสิทธิ์ผู้ใช้งาน",
    icon: Users,
    slug: "user-management",
    articleCount: 6,
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    name: "คำถามที่พบบ่อย",
    description: "คำตอบสำหรับปัญหาที่พบบ่อย",
    icon: HelpCircle,
    slug: "faq",
    articleCount: 12,
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    name: "ฟีเจอร์ขั้นสูง",
    description: "API, Webhooks และการวิเคราะห์ข้อมูล",
    icon: Zap,
    slug: "advanced",
    articleCount: 7,
    color: "bg-rose-500/10 text-rose-600",
  },
  {
    name: "ความปลอดภัย",
    description: "นโยบายและมาตรการด้านความปลอดภัย",
    icon: Shield,
    slug: "security",
    articleCount: 4,
    color: "bg-cyan-500/10 text-cyan-600",
  },
];

export function CategoryCards() {
  return (
    <section className="py-16 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground">เลือกหมวดหมู่</h2>
          <p className="mt-3 text-muted-foreground">
            เลือกหมวดหมู่ที่คุณต้องการเรียนรู้
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.slug} href={`/categories/${category.slug}`}>
                <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`shrink-0 rounded-xl p-3 ${category.color}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {category.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {category.articleCount} บทความ
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
