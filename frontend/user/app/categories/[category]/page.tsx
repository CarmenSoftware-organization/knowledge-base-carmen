import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { getCategory, getContent } from "@/lib/wiki-api";
import { notFound } from "next/navigation";
import { categoryDisplayMap } from "@/configs/sidebar-map";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { ArticleHeaderInfo } from "@/components/kb/article/article-header-info";
import { MarkdownRender } from "@/components/kb/article/markdown-content";
import matter from "gray-matter";
import { ArticleGridTransition } from "@/components/kb/article-grid-client";

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-10 items-start relative">
          
          {/* Sidebar - Desktop Sticky */}
          <aside className="hidden lg:block sticky top-24 shrink-0">
            <KBSidebar />
          </aside>

          <div className="flex-1 min-w-0">
            <Breadcrumb
              items={[
                { label: "หมวดหมู่", href: "/categories" },
                { label: categoryName },
              ]}
            />

            {indexContent && (
              <div className="mt-4">
                <ArticleHeaderInfo 
                  title={indexContent.data.title || categoryName} 
                  formattedDate={indexContent.data.date ? new Date(indexContent.data.date).toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' }) : null} 
                  tags={Array.isArray(indexContent.data.tags) ? indexContent.data.tags : []} 
                />
                
                <div className="border-b my-6 border-slate-200"></div>
                
                <MarkdownRender 
                   content={indexContent.content.toString().replace(/\n##/g, "\n\n##")} 
                   category={category} 
                />
                
                <div className="relative py-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200/60"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-gray-50 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      รายการบทความในหมวดนี้
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!indexContent && (
              <div className="mt-6 mb-6">
                <h1 className="text-3xl font-black text-foreground tracking-tight">{categoryName}</h1>
                <p className="text-muted-foreground mt-1 text-sm">รวมบทความทั้งหมดในหมวดนี้</p>
              </div>
            )}

            <ArticleGridTransition items={data.items} category={category} />
          </div>
        </div>
      </main>
      <KBFooter />
    </div>
  );
}