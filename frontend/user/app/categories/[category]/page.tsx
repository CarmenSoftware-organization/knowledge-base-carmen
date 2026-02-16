import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { getCategory, getContent } from "@/lib/wiki-api";
import { notFound } from "next/navigation";
import { articleDisplayMap, categoryDisplayMap, cleanTitle } from "@/configs/sidebar-map";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";

// สำหรับ Render เนื้อหา index.md
import { ArticleHeaderInfo } from "@/components/kb/article/article-header-info";
import { MarkdownRender } from "@/components/kb/article/markdown-content";
import matter from "gray-matter";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>; // ✅ ต้องเป็น Promise
}) {
  // 1. Await params เสมอสำหรับ Next.js 15
  const resolvedParams = await params;
  const category = resolvedParams.category;

  if (!category) {
    notFound();
  }

  // 2. ดึงข้อมูล Category และลองดึง index.md
  let data;
  let indexContent = null;

  try {
    data = await getCategory(category);
    
    // ลองหาไฟล์ index.md เพื่อมาโชว์เป็น Intro
    try {
      const rawIndex = await getContent(`${category}/index.md`);
      if (rawIndex) {
        indexContent = matter(rawIndex.content);
      }
    } catch {
      // ไม่มี index.md ไม่เป็นไร โชว์แค่ Cards ต่อไป
    }
  } catch {
    notFound();
  }

  const categoryName = categoryDisplayMap[data.category] || data.category.toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <KBHeader />
      <MobileSidebar />
      <main className="flex-1">
        {/* ✅ หัวใจสำคัญของ Sidebar Sticky คือ items-start */}
        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-10 items-start">
          
          {/* ฝั่งซ้าย: Sidebar (ต้องมี sticky top-28 ในตัว component) */}
          <KBSidebar />

          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <Breadcrumb
              items={[
                { label: "หมวดหมู่", href: "/categories" },
                { label: categoryName },
              ]}
            />

            {/* --- ส่วนที่ 1: เนื้อหาจาก index.md (ถ้ามี) --- */}
            {indexContent && (
              <div className="mt-6 mb-12">
                <ArticleHeaderInfo 
                  title={indexContent.data.title || categoryName} 
                  formattedDate={indexContent.data.date ? new Date(indexContent.data.date).toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' }) : null} 
                  tags={Array.isArray(indexContent.data.tags) ? indexContent.data.tags : []} 
                />
                <div className="border-b mb-8"></div>
                <MarkdownRender 
                   content={indexContent.content.toString().replace(/\n##/g, "\n\n##")} 
                   category={category} 
                />
                
                {/* ตัวแบ่งส่วน */}
                <div className="relative py-12">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-gray-50 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      รายการบทความใน {categoryName}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* --- ส่วนที่ 2: หัวข้อบทความ (โชว์เมื่อไม่มี index.md) --- */}
            {!indexContent && (
              <div className="mt-6 mb-10">
                <h1 className="text-4xl font-bold text-foreground">
                  {categoryName}
                </h1>
                <p className="text-muted-foreground mt-2">
                  รวมบทความทั้งหมดในหมวดนี้
                </p>
              </div>
            )}

            {/* --- ส่วนที่ 3: Cards Grid --- */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 mb-10">
              {data.items.map((item: any) => {
                // ไม่โชว์ index ในรูปแบบ Card เพราะดึงเนื้อหามาโชว์แล้ว
                if (item.slug === 'index') return null;

                const displayTitle = articleDisplayMap[item.slug] || cleanTitle(item.title);

                return (
                  <Link
                    key={item.path}
                    href={`/categories/${category}/${item.slug}`}
                    className="group"
                  >
                    <Card
                      className="
                        h-full
                        border border-primary/10
                        bg-card
                        transition-all
                        duration-300
                        hover:shadow-lg
                        hover:border-primary/30
                        hover:-translate-y-1
                      "
                    >
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex-1 pr-4">
                          <h2 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors leading-snug">
                            {displayTitle}
                          </h2>
                          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
                            คลิกเพื่ออ่านเนื้อหา
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary/60 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                          →
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      <KBFooter />
    </div>
  );
}