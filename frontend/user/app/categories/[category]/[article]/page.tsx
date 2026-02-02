import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { ArticleTags } from "@/components/kb/article-tags";
import { RelatedArticles } from "@/components/kb/related-articles";
import { TableOfContents } from "@/components/kb/table-of-contents";
import { ArticleFeedback } from "@/components/kb/article-feedback";
import { Clock, Eye, Calendar, User, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import type { Metadata } from "next";

// Category names mapping
const categoryNames: Record<string, string> = {
  "getting-started": "เริ่มต้นใช้งาน",
  "admin-guide": "การจัดการระบบ",
  "user-management": "การจัดการผู้ใช้",
  faq: "คำถามที่พบบ่อย",
  advanced: "ฟีเจอร์ขั้นสูง",
  security: "ความปลอดภัย",
};

// Sample article data
const getArticleData = (category: string, article: string) => {
  const baseData = {
    author: "ทีมสนับสนุน Jupyter",
    publishedAt: "15 มกราคม 2026",
    updatedAt: "20 มกราคม 2026",
    readTime: "5 นาที",
    views: 850,
  };

  const titles: Record<string, Record<string, string>> = {
    "getting-started": {
      introduction: "แนะนำ Jupyter Chatbot - เริ่มต้นใช้งานอย่างง่าย",
      installation: "การติดตั้งและตั้งค่าเบื้องต้น",
      "first-use": "คู่มือการใช้งานครั้งแรก",
    },
    "admin-guide": {
      "admin-setup": "การตั้งค่าผู้ดูแลระบบ",
      "user-management": "การจัดการผู้ใช้งาน",
      "customize-responses": "การปรับแต่งคำตอบ",
    },
    "user-management": {
      "add-user": "การเพิ่มผู้ใช้ใหม่",
      permissions: "การกำหนดสิทธิ์",
      "remove-user": "การลบผู้ใช้",
    },
    faq: {
      "login-issues": "ปัญหาการเข้าสู่ระบบ",
      "bot-not-responding": "Bot ไม่ตอบคำถาม - วิธีแก้ไข",
      "reset-password": "การรีเซ็ตรหัสผ่าน",
    },
    advanced: {
      "api-integration": "การเชื่อมต่อ API",
      webhooks: "Webhooks",
      analytics: "การวิเคราะห์ข้อมูล",
    },
    security: {
      "security-policy": "นโยบายความปลอดภัย",
      encryption: "การเข้ารหัสข้อมูล",
      backup: "การสำรองข้อมูล",
    },
  };

  const title = titles[category]?.[article] || "บทความ";

  return {
    ...baseData,
    title,
    category: categoryNames[category] || category,
    categorySlug: category,
    tags: ["Jupyter", "Chatbot", "คู่มือ", categoryNames[category] || category],
  };
};

const tocItems = [
  { id: "introduction", title: "บทนำ", level: 2 },
  { id: "overview", title: "ภาพรวม", level: 2 },
  { id: "steps", title: "ขั้นตอนการดำเนินการ", level: 2 },
  { id: "step-1", title: "ขั้นตอนที่ 1", level: 3 },
  { id: "step-2", title: "ขั้นตอนที่ 2", level: 3 },
  { id: "step-3", title: "ขั้นตอนที่ 3", level: 3 },
  { id: "tips", title: "เคล็ดลับ", level: 2 },
  { id: "summary", title: "สรุป", level: 2 },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; article: string }>;
}): Promise<Metadata> {
  const { category, article } = await params;
  const articleData = getArticleData(category, article);

  return {
    title: `${articleData.title} - Jupyter Knowledge Base`,
    description: `เรียนรู้เกี่ยวกับ ${articleData.title} ในหมวดหมู่ ${articleData.category}`,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ category: string; article: string }>;
}) {
  const { category, article } = await params;
  const articleData = getArticleData(category, article);

  const relatedArticles = [
    {
      title: "การติดตั้งและตั้งค่าเบื้องต้น",
      href: `/categories/${category}/installation`,
      category: articleData.category,
      readTime: "8 นาที",
    },
    {
      title: "คู่มือการใช้งานครั้งแรก",
      href: `/categories/${category}/first-use`,
      category: articleData.category,
      readTime: "6 นาที",
    },
    {
      title: "Bot ไม่ตอบคำถาม - วิธีแก้ไข",
      href: "/categories/faq/bot-not-responding",
      category: "คำถามที่พบบ่อย",
      readTime: "4 นาที",
    },
  ];

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
                  {
                    label: articleData.category,
                    href: `/categories/${articleData.categorySlug}`,
                  },
                  { label: articleData.title },
                ]}
              />

              {/* Article Header */}
              <header className="mt-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-balance leading-tight">
                  {articleData.title}
                </h1>

                {/* Meta Info */}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {articleData.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {articleData.publishedAt}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {articleData.readTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {articleData.views.toLocaleString()} views
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">พิมพ์</span>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">แชร์</span>
                  </Button>
                </div>
              </header>

              <Separator className="my-6" />

              {/* Two Column Layout */}
              <div className="flex gap-8">
                {/* Article Content */}
                <article className="flex-1 min-w-0 prose prose-slate dark:prose-invert max-w-none">
                  <section id="introduction">
                    <h2>บทนำ</h2>
                    <p>
                      ยินดีต้อนรับสู่บทความ &quot;{articleData.title}&quot;
                      ในบทความนี้ เราจะพาคุณไปเรียนรู้เนื้อหาที่สำคัญและจำเป็น
                      สำหรับการใช้งาน Jupyter Chatbot อย่างมีประสิทธิภาพ
                    </p>
                  </section>

                  <section id="overview">
                    <h2>ภาพรวม</h2>
                    <p>
                      Jupyter Chatbot
                      เป็นระบบช่วยตอบคำถามอัจฉริยะที่ถูกออกแบบมาเพื่อองค์กร
                      ช่วยให้พนักงานสามารถค้นหาข้อมูลและคำตอบได้อย่างรวดเร็ว
                      ไม่ว่าจะเป็นคำถามเกี่ยวกับนโยบาย ขั้นตอนการทำงาน
                      หรือข้อมูลทั่วไปต่างๆ
                    </p>
                    <p>หัวข้อหลักที่จะกล่าวถึงในบทความนี้:</p>
                    <ul>
                      <li>ขั้นตอนการดำเนินการทีละขั้น</li>
                      <li>เคล็ดลับและแนวทางปฏิบัติที่ดี</li>
                      <li>ข้อควรระวังและการแก้ไขปัญหา</li>
                    </ul>
                  </section>

                  <section id="steps">
                    <h2>ขั้นตอนการดำเนินการ</h2>

                    <h3 id="step-1">ขั้นตอนที่ 1: เตรียมความพร้อม</h3>
                    <p>
                      ก่อนเริ่มต้น ให้ตรวจสอบว่าคุณมีสิ่งต่อไปนี้พร้อมแล้ว:
                    </p>
                    <ul>
                      <li>บัญชีผู้ใช้งานที่ถูกต้อง</li>
                      <li>การเข้าถึงระบบผ่านเบราว์เซอร์</li>
                      <li>การเชื่อมต่ออินเทอร์เน็ตที่เสถียร</li>
                    </ul>

                    <h3 id="step-2">ขั้นตอนที่ 2: ดำเนินการ</h3>
                    <p>หลังจากเตรียมพร้อมแล้ว ให้ทำตามขั้นตอนดังนี้:</p>
                    <ol>
                      <li>เข้าสู่ระบบด้วยบัญชีของคุณ</li>
                      <li>นำทางไปยังส่วนที่ต้องการ</li>
                      <li>ดำเนินการตามที่ต้องการ</li>
                    </ol>
                    <div className="not-prose my-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-sm text-primary font-medium">
                        Tip: หากพบปัญหาในขั้นตอนนี้ ลองรีเฟรชหน้าจอ
                        หรือล้างแคชของเบราว์เซอร์
                      </p>
                    </div>

                    <h3 id="step-3">ขั้นตอนที่ 3: ตรวจสอบผลลัพธ์</h3>
                    <p>
                      หลังจากดำเนินการเสร็จสิ้น
                      ให้ตรวจสอบว่าทุกอย่างทำงานถูกต้อง:
                    </p>
                    <ul>
                      <li>ตรวจสอบการแจ้งเตือนความสำเร็จ</li>
                      <li>ยืนยันการเปลี่ยนแปลงในระบบ</li>
                      <li>ทดสอบฟังก์ชันที่เกี่ยวข้อง</li>
                    </ul>
                  </section>

                  <section id="tips">
                    <h2>เคล็ดลับ</h2>
                    <p>เพื่อให้ได้ผลลัพธ์ที่ดีที่สุด ลองทำตามเคล็ดลับเหล่านี้:</p>
                    <ol>
                      <li>
                        <strong>วางแผนล่วงหน้า:</strong>{" "}
                        ทำความเข้าใจขั้นตอนก่อนเริ่มดำเนินการ
                      </li>
                      <li>
                        <strong>สำรองข้อมูล:</strong>{" "}
                        ควรสำรองข้อมูลก่อนทำการเปลี่ยนแปลงสำคัญ
                      </li>
                      <li>
                        <strong>ทดสอบก่อน:</strong>{" "}
                        หากเป็นไปได้ ให้ทดสอบในสภาพแวดล้อมทดสอบก่อน
                      </li>
                      <li>
                        <strong>ขอความช่วยเหลือ:</strong>{" "}
                        หากไม่แน่ใจ อย่าลังเลที่จะติดต่อทีมสนับสนุน
                      </li>
                    </ol>
                  </section>

                  <section id="summary">
                    <h2>สรุป</h2>
                    <p>
                      ในบทความนี้ เราได้เรียนรู้เกี่ยวกับ{" "}
                      &quot;{articleData.title}&quot;
                      ตั้งแต่พื้นฐานไปจนถึงขั้นตอนการดำเนินการจริง
                      หากมีข้อสงสัยเพิ่มเติม สามารถดูบทความอื่นๆ ที่เกี่ยวข้อง
                      หรือติดต่อทีมสนับสนุนได้ตลอด 24 ชั่วโมง
                    </p>
                  </section>
                </article>

                {/* Right Sidebar */}
                <aside className="hidden xl:block w-72 shrink-0 space-y-6">
                  <TableOfContents items={tocItems} />
                  <RelatedArticles articles={relatedArticles} />
                </aside>
              </div>

              {/* Tags Section */}
              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  แท็กและคำค้นหาที่เกี่ยวข้อง
                </h3>
                <ArticleTags tags={articleData.tags} />
              </div>

              {/* Mobile Related Articles */}
              <div className="xl:hidden mt-8">
                <RelatedArticles articles={relatedArticles} />
              </div>

              {/* Feedback Section */}
              <div className="mt-8">
                <ArticleFeedback />
              </div>

              {/* Updated Info */}
              <div className="mt-6 text-sm text-muted-foreground text-center">
                อัปเดตล่าสุด: {articleData.updatedAt}
              </div>

              {/* Navigation */}
              <div className="mt-8 pt-6 border-t border-border flex justify-between">
                <Link
                  href={`/categories/${category}`}
                  className="text-sm text-primary hover:underline"
                >
                  กลับไปหน้าหมวดหมู่
                </Link>
                <Link
                  href="/categories"
                  className="text-sm text-primary hover:underline"
                >
                  ดูหมวดหมู่ทั้งหมด
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <KBFooter />
    </div>
  );
}
