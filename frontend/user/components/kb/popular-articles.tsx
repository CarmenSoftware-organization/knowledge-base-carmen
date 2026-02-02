import Link from "next/link";
import { Clock, Eye, ArrowRight, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const popularArticles = [
  {
    title: "แนะนำ Jupyter Chatbot - เริ่มต้นใช้งานอย่างง่าย",
    description:
      "เรียนรู้พื้นฐานการใช้งาน Jupyter Chatbot ตั้งแต่การเข้าสู่ระบบไปจนถึงการถามคำถามแรก",
    category: "เริ่มต้นใช้งาน",
    categorySlug: "getting-started",
    slug: "introduction",
    readTime: "5 นาที",
    views: 1250,
    isNew: true,
  },
  {
    title: "การตั้งค่าผู้ดูแลระบบ",
    description:
      "คู่มือการตั้งค่าและกำหนดสิทธิ์สำหรับผู้ดูแลระบบอย่างละเอียด",
    category: "การจัดการระบบ",
    categorySlug: "admin-guide",
    slug: "admin-setup",
    readTime: "8 นาที",
    views: 890,
    isNew: false,
  },
  {
    title: "Bot ไม่ตอบคำถาม - วิธีแก้ไข",
    description:
      "รวมวิธีแก้ไขปัญหาเมื่อ Bot ไม่ตอบคำถามหรือตอบไม่ตรงประเด็น",
    category: "คำถามที่พบบ่อย",
    categorySlug: "faq",
    slug: "bot-not-responding",
    readTime: "4 นาที",
    views: 2100,
    isNew: false,
  },
  {
    title: "การเชื่อมต่อ API",
    description:
      "เรียนรู้การใช้ API เพื่อเชื่อมต่อ Jupyter กับระบบอื่นๆ ในองค์กร",
    category: "ฟีเจอร์ขั้นสูง",
    categorySlug: "advanced",
    slug: "api-integration",
    readTime: "12 นาที",
    views: 650,
    isNew: true,
  },
];

export function PopularArticles() {
  return (
    <section className="py-16 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">ยอดนิยม</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              บทความยอดนิยม
            </h2>
          </div>
          <Link
            href="/categories"
            className="hidden sm:flex items-center gap-1 text-sm text-primary hover:underline"
          >
            ดูทั้งหมด
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {popularArticles.map((article) => (
            <Link
              key={article.slug}
              href={`/categories/${article.categorySlug}/${article.slug}`}
            >
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/30 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {article.category}
                        </Badge>
                        {article.isNew && (
                          <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                            ใหม่
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {article.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {article.readTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {article.views.toLocaleString()} views
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Mobile Link */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/categories"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            ดูบทความทั้งหมด
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
