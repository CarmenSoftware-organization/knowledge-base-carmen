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
import { ArticleHeaderInfo } from "@/components/kb/article/article-header-info";
import { MarkdownRender } from "@/components/kb/article/markdown-content";
import matter from "gray-matter";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>; 
}) {
  const resolvedParams = await params;
  const category = resolvedParams.category;

  if (!category) notFound();

  let data;
  let indexContent = null;

  try {
    data = await getCategory(category);
    
    try {
      const rawIndex = await getContent(`${category}/index.md`);
      if (rawIndex) {
        indexContent = matter(rawIndex.content);
      }
    } catch (e) {
    }
  } catch (err) {
    notFound();
  }

  const categoryName = categoryDisplayMap[data.category] || data.category.toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <KBHeader />
      <MobileSidebar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10 flex gap-10 items-start relative">
          
          <KBSidebar />

          <div className="flex-1 min-w-0">
            <Breadcrumb
              items={[
                { label: "หมวดหมู่", href: "/categories" },
                { label: categoryName },
              ]}
            />

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
                
                <div className="relative py-12">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-gray-50 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      รายการบทความในหมวดนี้
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!indexContent && (
              <div className="mt-6 mb-10">
                <h1 className="text-4xl font-bold text-foreground">{categoryName}</h1>
                <p className="text-muted-foreground mt-2">รวมบทความทั้งหมดในหมวดนี้</p>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 mb-10">
              {data.items.map((item: any) => {
                if (item.slug === 'index') return null; 
                const displayTitle = articleDisplayMap[item.slug] || cleanTitle(item.title);
                return (
                  <Link key={item.path} href={`/categories/${category}/${item.slug}`} className="group">
                    <Card className="h-full border border-primary/10 bg-white transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex-1 pr-4">
                          <h2 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors leading-snug">
                            {displayTitle}
                          </h2>
                          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">คลิกเพื่ออ่าน</p>
                        </div>
                        <div className="text-primary opacity-40 group-hover:opacity-100 transition-opacity">→</div>
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