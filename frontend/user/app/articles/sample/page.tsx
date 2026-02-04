import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { ArticleTags } from "@/components/kb/article-tags";
import { RelatedArticles } from "@/components/kb/related-articles";
import { TableOfContents } from "@/components/kb/table-of-contents";
import { ArticleFeedback } from "@/components/kb/article-feedback";
// Remove the direct import from 'lucide-react' due to the missing module or typings error.
// Instead, import icons from the local components/icons directory if available, or comment out for now.
// import { Clock, Eye, Calendar, User, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "แนะนำ Jupyter Chatbot - Jupyter Knowledge Base",
  description:
    "เรียนรู้พื้นฐานการใช้งาน Jupyter Chatbot ตั้งแต่การเข้าสู่ระบบไปจนถึงการถามคำถามแรก",
};

// Sample data
const articleData = {
  title: "แนะนำ Jupyter Chatbot - เริ่มต้นใช้งานอย่างง่าย",
  category: "เริ่มต้นใช้งาน",
  categorySlug: "getting-started",
  author: "ทีมสนับสนุน Jupyter",
  publishedAt: "15 มกราคม 2026",
  updatedAt: "20 มกราคม 2026",
  readTime: "5 นาที",
  views: 1250,
  tags: [
    "เริ่มต้น",
    "คู่มือ",
    "Chatbot",
    "การใช้งาน",
    "FAQ",
    "พื้นฐาน",
    "ติดตั้ง",
  ],
};

const tocItems = [
  { id: "introduction", title: "บทนำ", level: 2 },
  { id: "what-is-jupyter", title: "Jupyter Chatbot คืออะไร", level: 2 },
  { id: "getting-started", title: "เริ่มต้นใช้งาน", level: 2 },
  { id: "step-1", title: "ขั้นตอนที่ 1: เข้าสู่ระบบ", level: 3 },
  { id: "step-2", title: "ขั้นตอนที่ 2: ทำความรู้จักหน้าจอหลัก", level: 3 },
  { id: "step-3", title: "ขั้นตอนที่ 3: ถามคำถามแรก", level: 3 },
  { id: "tips", title: "เคล็ดลับการใช้งาน", level: 2 },
  { id: "summary", title: "สรุป", level: 2 },
];

const relatedArticles = [
  {
    title: "การติดตั้งและตั้งค่าเบื้องต้น",
    href: "/categories/getting-started/installation",
    category: "เริ่มต้นใช้งาน",
    readTime: "8 นาที",
  },
  {
    title: "คู่มือการใช้งานครั้งแรก",
    href: "/categories/getting-started/first-use",
    category: "เริ่มต้นใช้งาน",
    readTime: "6 นาที",
  },
  {
    title: "Bot ไม่ตอบคำถาม - วิธีแก้ไข",
    href: "/categories/faq/bot-not-responding",
    category: "คำถามที่พบบ่อย",
    readTime: "4 นาที",
  },
  {
    title: "การปรับแต่งคำตอบ",
    href: "/categories/admin-guide/customize-responses",
    category: "การจัดการระบบ",
    readTime: "10 นาที",
  },
];

export default function SampleArticlePage() {
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
                    {/* TODO: Import User icon at top of file: import { User } from 'lucide-react'; */}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="7" r="4" />
                      <path d="M5.5 19a4.5 4.5 0 0 1 13 0" />
                    </svg>
                    {articleData.author}
                  </span>
                  <span className="flex items-center gap-1">
                    {/* TODO: Import Calendar icon at top of file: import { Calendar } from 'lucide-react'; */}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect width="18" height="18" x="3" y="4" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {articleData.publishedAt}
                  </span>
                  <span className="flex items-center gap-1">
                    {/* TODO: Import Clock icon at top of file: import { Clock } from 'lucide-react'; */}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    {articleData.readTime}
                  </span>
                  <span className="flex items-center gap-1">
                    {/* TODO: Import Eye icon at top of file: import { Eye } from 'lucide-react'; */}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {articleData.views.toLocaleString()} views
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                    {/* TODO: Import Printer icon at top of file: import { Printer } from 'lucide-react'; */}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect width="12" height="8" x="6" y="14" />
                    </svg>
                    <span className="hidden sm:inline">พิมพ์</span>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                    {/* TODO: Import Share2 icon at top of file: import { Share2 } from 'lucide-react'; */}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="18" cy="5" r="3"/>
                      <circle cx="6" cy="12" r="3"/>
                      <circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    <span className="hidden sm:inline">แชร์</span>
                  </Button>
                </div>
              </header>

              <Separator className="my-6" />

              {/* Two Column Layout: Article + Right Sidebar */}
              <div className="flex gap-8">
                {/* Article Content */}
                <article className="flex-1 min-w-0 prose prose-slate dark:prose-invert max-w-none">
                  <section id="introduction">
                    <h2>บทนำ</h2>
                    <p>
                      ยินดีต้อนรับสู่คู่มือการใช้งาน Jupyter Chatbot
                      ระบบช่วยตอบคำถามอัจฉริยะที่จะช่วยให้การทำงานในองค์กรของคุณง่ายขึ้น
                      ในบทความนี้เราจะพาคุณไปรู้จักกับ Jupyter
                      ตั้งแต่พื้นฐานไปจนถึงการใช้งานจริง
                    </p>
                  </section>

                  <section id="what-is-jupyter">
                    <h2>Jupyter Chatbot คืออะไร</h2>
                    <p>
                      Jupyter Chatbot
                      คือระบบแชทบอทอัจฉริยะที่ถูกออกแบบมาเพื่อตอบคำถามทั่วไปภายในองค์กร
                      ไม่ว่าจะเป็นคำถามเกี่ยวกับนโยบายบริษัท
                      ขั้นตอนการทำงาน หรือข้อมูลที่จำเป็นต่างๆ
                      Jupyter สามารถให้คำตอบได้อย่างรวดเร็วและแม่นยำ
                    </p>
                    <p>คุณสมบัติเด่น:</p>
                    <ul>
                      <li>ตอบคำถามได้ตลอด 24 ชั่วโมง</li>
                      <li>เข้าใจภาษาไทยได้อย่างเป็นธรรมชาติ</li>
                      <li>เรียนรู้และพัฒนาได้ต่อเนื่อง</li>
                      <li>รองรับการทำงานบนทุกอุปกรณ์</li>
                    </ul>
                  </section>

                  <section id="getting-started">
                    <h2>เริ่มต้นใช้งาน</h2>
                    <p>
                      มาเริ่มต้นใช้งาน Jupyter กันเลย!
                      ทำตามขั้นตอนง่ายๆ ดังนี้:
                    </p>

                    <h3 id="step-1">ขั้นตอนที่ 1: เข้าสู่ระบบ</h3>
                    <p>
                      เปิดเบราว์เซอร์และเข้าไปที่ระบบ Jupyter ของบริษัท
                      จากนั้นล็อกอินด้วยอีเมลและรหัสผ่านของคุณ
                      หากคุณยังไม่มีบัญชี ให้ติดต่อผู้ดูแลระบบ
                    </p>
                    <div className="not-prose my-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-sm text-primary font-medium">
                        Tip: หากลืมรหัสผ่าน สามารถกด
                        &quot;ลืมรหัสผ่าน&quot; ที่หน้าล็อกอินได้เลย
                      </p>
                    </div>

                    <h3 id="step-2">ขั้นตอนที่ 2: ทำความรู้จักหน้าจอหลัก</h3>
                    <p>หลังจากล็อกอินสำเร็จ คุณจะเห็นหน้าจอหลักที่ประกอบด้วย:</p>
                    <ul>
                      <li>
                        <strong>ช่องแชท:</strong>{" "}
                        สำหรับพิมพ์คำถามของคุณ
                      </li>
                      <li>
                        <strong>ประวัติการสนทนา:</strong>{" "}
                        แสดงบทสนทนาที่ผ่านมา
                      </li>
                      <li>
                        <strong>เมนูด้านข้าง:</strong>{" "}
                        เข้าถึงฟีเจอร์เพิ่มเติม
                      </li>
                    </ul>

                    <h3 id="step-3">ขั้นตอนที่ 3: ถามคำถามแรก</h3>
                    <p>
                      พิมพ์คำถามของคุณลงในช่องแชท เช่น
                      &quot;วันลาพักร้อนมีกี่วัน?&quot; หรือ
                      &quot;ขั้นตอนการเบิกค่าใช้จ่าย&quot; แล้วกด Enter
                      Jupyter จะประมวลผลและตอบคำถามของคุณภายในไม่กี่วินาที
                    </p>
                  </section>

                  <section id="tips">
                    <h2>เคล็ดลับการใช้งาน</h2>
                    <p>
                      เพื่อให้ได้คำตอบที่ตรงใจมากที่สุด ลองทำตามเคล็ดลับเหล่านี้:
                    </p>
                    <ol>
                      <li>
                        <strong>ถามชัดเจน:</strong>{" "}
                        ยิ่งคำถามชัดเจน ยิ่งได้คำตอบตรงประเด็น
                      </li>
                      <li>
                        <strong>ใช้คำค้นหาที่เกี่ยวข้อง:</strong>{" "}
                        ระบุคีย์เวิร์ดสำคัญในคำถาม
                      </li>
                      <li>
                        <strong>ถามทีละเรื่อง:</strong>{" "}
                        หลีกเลี่ยงการถามหลายคำถามพร้อมกัน
                      </li>
                      <li>
                        <strong>ให้ Feedback:</strong>{" "}
                        กดถูกใจหรือไม่ถูกใจเพื่อช่วยให้ Bot เรียนรู้
                      </li>
                    </ol>
                  </section>

                  <section id="summary">
                    <h2>สรุป</h2>
                    <p>
                      Jupyter Chatbot
                      เป็นเครื่องมือที่ช่วยให้การค้นหาข้อมูลภายในองค์กรเป็นเรื่องง่าย
                      เริ่มต้นใช้งานได้ง่ายๆ เพียงล็อกอิน
                      และเริ่มถามคำถามของคุณได้เลย
                      หากมีข้อสงสัยเพิ่มเติม สามารถดูบทความอื่นๆ
                      ในหมวดหมู่ &quot;เริ่มต้นใช้งาน&quot;
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
            </div>
          </div>
        </div>
      </main>
      <KBFooter />
    </div>
  );
}
