import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { getCategory, getContent } from "@/lib/wiki-api";
import { notFound, redirect } from "next/navigation";
import { categoryDisplayMap } from "@/configs/sidebar-map";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { ArticleHeaderInfo } from "@/components/kb/article/article-header-info";
import { MarkdownRender } from "@/components/kb/article/markdown-content";
import matter from "gray-matter";
import { ArticleGridTransition } from "@/components/kb/article-grid-client";
import { ChangelogTimeline } from "@/components/kb/changelog-timeline";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { DEFAULT_BU } from "@/lib/config";
import { buildChangelogNavList } from "@/lib/changelog-utils";
import { ChangelogSidebar } from "@/components/kb/changelog-sidebar";
import { cn } from "@/lib/utils";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const resolvedParams = await params;
  const category = resolvedParams.category;
  const resolvedSearch = await searchParams;
  const pageRaw = resolvedSearch.page;
  const pageStr = Array.isArray(pageRaw) ? pageRaw[0] : pageRaw;
  const changelogPage = Math.max(1, parseInt(pageStr || "1", 10) || 1);

  if (!category) notFound();

  if (category.toLowerCase() === "faq") {
    redirect("/faq");
  }

  const isChangelog = category.toLowerCase() === "changelog";
  const cookieStore = await cookies();
  const bu = (cookieStore.get("selected_bu")?.value || DEFAULT_BU).trim().toLowerCase();
  // Changelog is global content and must not vary by selected BU.
  const contentBu = isChangelog ? DEFAULT_BU : bu;
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value || "th";
  const locale = isChangelog ? "en" : cookieLocale;

  let data: Awaited<ReturnType<typeof getCategory>> | null = null;
  let categoryLoadFailed = false;
  try {
    data = await getCategory(category, contentBu, { cache: "no-store" });
  } catch {
    categoryLoadFailed = true;
  }

  const noManualContent = !isChangelog && (!data?.items?.length || categoryLoadFailed);

  // Changelog list page: skip index.md (legacy long content).
  let indexContent = null;
  if (!isChangelog) {
    try {
      const rawIndex = await getContent(`${category}/index.md`, contentBu, locale, {
        cache: "no-store",
      });
      if (rawIndex) {
        indexContent = matter(rawIndex.content);
      }
    } catch {
      // No index.md is OK if category has other articles
    }
  }

  const categoryName =
    categoryDisplayMap[data?.category || category] ||
    (data?.category || category).toUpperCase();

  const gridItems = (data?.items || []).filter((item) => {
    const p = item.path.replace(/\\/g, "/");
    return item.slug !== "index" && !p.includes("/_images/");
  });
  const changelogSorted = isChangelog ? buildChangelogNavList(data?.items) : [];

  const t = await getTranslations();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      <MobileSidebar
        changelogItems={isChangelog && changelogSorted.length ? changelogSorted : undefined}
      />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex gap-10 items-start relative">
          {!isChangelog && (
            <aside className="hidden lg:block sticky top-24 shrink-0">
              <KBSidebar />
            </aside>
          )}

          {isChangelog && changelogSorted.length > 0 && (
            <aside className="hidden lg:block sticky top-24 shrink-0">
              <ChangelogSidebar items={changelogSorted} />
            </aside>
          )}

          <div className={cn("min-w-0", "flex-1")}>
            <Breadcrumb
              items={[
                { label: t("common.categories"), href: "/categories" },
                { label: categoryName },
              ]}
            />

            {noManualContent ? (
              <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
                <p className="text-base font-semibold text-foreground">ไม่มีข้อมูลคู่มือ</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  ยังไม่มีเนื้อหาในหมวดนี้ หรือระบบยังโหลดข้อมูลไม่สำเร็จ
                </p>
              </div>
            ) : indexContent && (
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
                  wikiArticleDir={category}
                  bu={bu}
                />

                {/* Section divider with label */}
                <div className="relative py-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                      {isChangelog
                        ? "Release history"
                        : t("category.articlesInCategory")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!noManualContent && !indexContent && (
              <div className={cn("mt-6", isChangelog ? "mb-2" : "mb-6")}>
                <h1 className="text-3xl font-black text-foreground tracking-tight">
                  {categoryName}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  {isChangelog
                    ? "Newest releases first, grouped by year. Open a card for full notes."
                    : t("category.allArticlesInCategory")}
                </p>
              </div>
            )}

            {noManualContent ? null : isChangelog ? (
              <ChangelogTimeline
                category={category}
                items={changelogSorted}
                page={changelogPage}
              />
            ) : (
              <ArticleGridTransition items={gridItems} category={category} />
            )}
          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}