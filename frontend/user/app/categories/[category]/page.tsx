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
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const resolvedParams = await params;
  const category = resolvedParams.category;

  if (!category) notFound();

  const cookieStore = await cookies();
  const bu = cookieStore.get("selected_bu")?.value || "carmen";

  let data;
  let indexContent = null;

  try {
    data = await getCategory(category, bu);

    try {
      const rawIndex = await getContent(`${category}/index.md`, bu);
      if (rawIndex) {
        indexContent = matter(rawIndex.content);
      }
    } catch (e) {}
  } catch (err) {
    notFound();
  }

  const categoryName =
    categoryDisplayMap[data.category] || data.category.toUpperCase();

  const t = await getTranslations();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      <MobileSidebar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-10 items-start relative">

          {/* Sidebar */}
          <aside className="hidden lg:block sticky top-24 shrink-0">
            <KBSidebar />
          </aside>

          <div className="flex-1 min-w-0">
            <Breadcrumb
              items={[
                { label: t("common.categories"), href: "/categories" },
                { label: categoryName },
              ]}
            />

            {indexContent && (
              <div className="mt-4">
                <ArticleHeaderInfo
                  title={indexContent.data.title || categoryName}
                  formattedDate={
                    indexContent.data.date
                      ? new Date(indexContent.data.date).toLocaleDateString(
                          "th-TH",
                          { year: "numeric", month: "long", day: "numeric" }
                        )
                      : null
                  }
                  tags={
                    Array.isArray(indexContent.data.tags)
                      ? indexContent.data.tags
                      : []
                  }
                />

                {/* Divider */}
                <div className="border-b my-6 border-border"></div>

                <MarkdownRender
                  content={indexContent.content
                    .toString()
                    .replace(/\n##/g, "\n\n##")}
                  category={category}
                />

                {/* Section divider with label */}
                <div className="relative py-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                      {t("category.articlesInCategory")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!indexContent && (
              <div className="mt-6 mb-6">
                <h1 className="text-3xl font-black text-foreground tracking-tight">
                  {categoryName}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t("category.allArticlesInCategory")}
                </p>
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