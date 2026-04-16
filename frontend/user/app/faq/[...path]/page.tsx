import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { getCategory, getContent } from "@/lib/wiki-api";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { ArticleGridTransition } from "@/components/kb/article-grid-client";
import { FaqFolderGrid } from "@/components/kb/faq-folder-grid";
import { ArticleHeaderInfo } from "@/components/kb/article/article-header-info";
import { MarkdownRender } from "@/components/kb/article/markdown-content";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import matter from "gray-matter";
import { categoryDisplayMap } from "@/configs/sidebar-map";
import { DEFAULT_BU } from "@/lib/config";
import { buildFaqNav, faqSegmentLabel } from "@/lib/faq-nav";
import { notFound } from "next/navigation";

const FAQ_SLUG = "faq";

type Props = {
  params: Promise<{ path: string[] }>;
};

export default async function FAQSubPage({ params }: Props) {
  const t = await getTranslations();
  const { path: rawPath } = await params;
  if (!rawPath?.length) notFound();

  const pathSegments = rawPath.map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });

  const cookieStore = await cookies();
  const bu = (cookieStore.get("selected_bu")?.value || DEFAULT_BU).trim().toLowerCase();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value || "th";

  let data: Awaited<ReturnType<typeof getCategory>>;
  let indexContent: ReturnType<typeof matter> | null = null;

  try {
    data = await getCategory(FAQ_SLUG, bu);
    try {
      const indexRel = `${FAQ_SLUG}/${pathSegments.join("/")}/index.md`;
      const rawIndex = await getContent(indexRel, bu, cookieLocale);
      if (rawIndex) {
        indexContent = matter(rawIndex.content);
      }
    } catch {
      indexContent = null;
    }
  } catch {
    notFound();
  }

  const nav = buildFaqNav(pathSegments, data.items);
  if (nav.folders.length === 0 && nav.articles.length === 0) {
    notFound();
  }

  const categoryName = categoryDisplayMap[FAQ_SLUG] || "FAQ";
  const leafTitle = faqSegmentLabel(pathSegments[pathSegments.length - 1] ?? "");

  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: t("common.categories"), href: "/categories" },
    { label: categoryName, href: "/faq" },
  ];

  for (let i = 0; i < pathSegments.length; i++) {
    const seg = pathSegments[i];
    const label = faqSegmentLabel(seg);
    const isLast = i === pathSegments.length - 1;
    if (isLast) {
      const titleFromIndex =
        indexContent && typeof indexContent.data.title === "string"
          ? indexContent.data.title
          : null;
      breadcrumbItems.push({ label: titleFromIndex || label });
    } else {
      const href = `/faq/${pathSegments
        .slice(0, i + 1)
        .map((s) => encodeURIComponent(s))
        .join("/")}`;
      breadcrumbItems.push({ label, href });
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      <MobileSidebar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-10 items-start relative">
          <aside className="hidden lg:block sticky top-24 shrink-0">
            <KBSidebar />
          </aside>

          <div className="flex-1 min-w-0">
            <Breadcrumb items={breadcrumbItems} />

            <div className="mt-6 mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
                FAQ
              </p>
              <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                {indexContent
                  ? ((indexContent.data.title as string) || leafTitle)
                  : leafTitle}
              </h1>
              {indexContent?.data.description ? (
                <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
                  {indexContent.data.description as string}
                </p>
              ) : null}
            </div>

            {indexContent && (
              <div className="mt-4 mb-8">
                <ArticleHeaderInfo
                  title={(indexContent.data.title as string) || leafTitle}
                  formattedDate={
                    indexContent.data.date
                      ? new Date(
                          indexContent.data.date as string
                        ).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : null
                  }
                  tags={
                    Array.isArray(indexContent.data.tags)
                      ? (indexContent.data.tags as string[])
                      : []
                  }
                />
                <div className="border-b my-6 border-border" />
                <MarkdownRender
                  content={indexContent.content
                    .toString()
                    .replace(/\n##/g, "\n\n##")}
                  category={FAQ_SLUG}
                />
              </div>
            )}

            {nav.folders.length > 0 && (
              <>
                <div className="relative py-6 mb-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                      หมวดย่อย
                    </span>
                  </div>
                </div>
                <FaqFolderGrid folders={nav.folders} pathPrefix={pathSegments} />
              </>
            )}

            {nav.articles.length > 0 && (
              <>
                <div className="relative py-6 mb-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                      {t("category.articlesInCategory")}
                    </span>
                  </div>
                </div>
                <ArticleGridTransition items={nav.articles} />
              </>
            )}
          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}
