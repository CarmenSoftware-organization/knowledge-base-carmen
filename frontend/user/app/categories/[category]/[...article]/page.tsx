import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import {
  getContent,
  normalizeWikiRelPath,
  wikiDirFromContentPath,
} from "@/lib/wiki-api";
import { formatCategoryName } from "@/lib/wiki-utils";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import { TableOfContents } from "@/components/kb/toc";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { FaqSidebar } from "@/components/kb/faq-sidebar";
import { ArticleHeaderInfo } from "@/components/kb/article/article-header-info";
import { MarkdownRender } from "@/components/kb/article/markdown-content";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { DEFAULT_BU } from "@/lib/config";
import { faqSegmentLabel } from "@/lib/faq-nav";
import { getCachedFaqNavItems } from "@/lib/faq-cache";

type Props = {
  params: Promise<{
    category: string;
    article: string[];
  }>;
  searchParams: Promise<{
    path?: string;
  }>;
};

function humanizeSegment(seg: string): string {
  try {
    return decodeURIComponent(seg).replace(/-/g, " ").replace(/_/g, " ");
  } catch {
    return seg.replace(/-/g, " ").replace(/_/g, " ");
  }
}

export default async function ArticlePage({ params }: Props) {
  const { category, article: articleSegments } = await params;
  const categoryLower = category?.toLowerCase() || "";

  if (!category || !articleSegments?.length) {
    notFound();
  }

  const cookieStore = await cookies();
  const bu = (cookieStore.get("selected_bu")?.value || DEFAULT_BU)
    .trim()
    .toLowerCase();
  const isChangelogCategory = category.toLowerCase() === "changelog";
  // Changelog is shared across all BUs.
  const contentBu = isChangelogCategory ? DEFAULT_BU : bu;
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value || "th";

  const locale = isChangelogCategory ? "en" : cookieLocale;

  const relBase = normalizeWikiRelPath(
    [category, ...articleSegments].join("/"),
  );
  const primaryPath = `${relBase}.md`;
  const folderIndexPath = `${relBase}/index.md`;

  let raw;
  try {
    raw = await getContent(primaryPath, contentBu, locale, { cache: "no-store" });
  } catch {
    try {
      raw = await getContent(folderIndexPath, contentBu, locale, { cache: "no-store" });
    } catch {
      if (categoryLower !== "faq" && categoryLower !== "changelog") {
        return (
          <div className="min-h-screen flex flex-col bg-background">
            <KBHeader />
            <MobileSidebar />
            <main className="flex-1">
              <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-8 flex gap-6 sm:gap-8 lg:gap-10 items-start">
                <div className="hidden xl:block shrink-0 self-start sticky top-24">
                  <KBSidebar />
                </div>
                <div className="min-w-0 w-full max-w-4xl flex-1">
                  <Breadcrumb
                    items={[
                      { label: "คู่มือ", href: "/categories" },
                      { label: formatCategoryName(category), href: `/categories/${encodeURIComponent(category)}` },
                      { label: "ไม่มีข้อมูล" },
                    ]}
                  />
                  <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
                    <p className="text-base font-semibold text-foreground">ไม่มีเนื้อหาคู่มือ</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      ไม่พบบทความหรือโฟลเดอร์ที่ต้องการเปิดในหมวดนี้
                    </p>
                  </div>
                </div>
              </div>
            </main>
            <KBFooter />
          </div>
        );
      }
      notFound();
    }
  }

  const catLower = category.toLowerCase();
  const isFaqArticle = catLower === "faq";
  const isChangelogArticle = catLower === "changelog";
  const faqNavItems = isFaqArticle ? await getCachedFaqNavItems(bu) : [];

  const { data: frontmatter, content } = matter(raw.content);

  const title =
    typeof frontmatter.title === "string" ? frontmatter.title : raw.title;

  const description =
    typeof frontmatter.description === "string"
      ? frontmatter.description
      : raw.description;

  const editor =
    typeof frontmatter.editor === "string" ? frontmatter.editor : raw.editor;

  const tags =
    typeof frontmatter.tags === "string"
      ? frontmatter.tags.split(",").map((t: string) => t.trim())
      : Array.isArray(frontmatter.tags)
        ? frontmatter.tags
        : raw.tags || [];

  const publishedAt =
    typeof frontmatter.date === "string" ? frontmatter.date : raw.publishedAt;

  const dateLocale = locale === "en" ? "en-US" : "th-TH";
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const contentString = content.toString();
  const fixedContent = contentString.replace(/\n##/g, "\n\n##");

  const wikiArticleDir = raw.path
    ? wikiDirFromContentPath(raw.path)
    : articleSegments.length > 1
      ? `${category}/${articleSegments.slice(0, -1).join("/")}`
      : category;

  const t = await getTranslations();

  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: t("common.categories"), href: "/categories" },
  ];

  if (catLower === "faq") {
    breadcrumbItems.push({ label: formatCategoryName(category), href: "/faq" });
  } else {
    breadcrumbItems.push({
      label: formatCategoryName(category),
      href: `/categories/${encodeURIComponent(category)}`,
    });
  }

  const folderSegments = articleSegments.slice(0, -1);
  for (let i = 0; i < folderSegments.length; i++) {
    const seg = folderSegments[i];
    const label =
      catLower === "faq" ? faqSegmentLabel(seg) : humanizeSegment(seg);
    if (catLower === "faq") {
      const href = `/faq/${folderSegments
        .slice(0, i + 1)
        .map((s) => encodeURIComponent(s))
        .join("/")}`;
      breadcrumbItems.push({ label, href });
    } else {
      breadcrumbItems.push({ label });
    }
  }

  breadcrumbItems.push({ label: title });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      {/* MobileSidebar owns the mobile TOC drawer — no inline TOC needed on mobile */}
      <MobileSidebar
        faqItems={
          isFaqArticle && faqNavItems.length > 0 ? faqNavItems : undefined
        }
      />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-8 lg:py-10 flex gap-6 sm:gap-8 lg:gap-10 items-start">
          {!isFaqArticle && !isChangelogArticle && (
            <div className="hidden xl:block shrink-0 self-start sticky top-24">
              <KBSidebar />
            </div>
          )}

          {isFaqArticle && faqNavItems.length > 0 && (
            <div className="hidden xl:block shrink-0 self-start sticky top-24">
              <FaqSidebar items={faqNavItems} />
            </div>
          )}

          <div className="min-w-0 w-full max-w-4xl flex-1">
            <Breadcrumb items={breadcrumbItems} />

            <ArticleHeaderInfo
              title={title}
              description={description}
              formattedDate={formattedDate}
              tags={tags}
              editor={editor}
            />

            <div className="border-b border-border mb-8"></div>

            {/*
              ❌ REMOVED the old duplicate block:
                <div className="block xl:hidden mb-8">
                  <TableOfContents />
                </div>
              Mobile TOC is now exclusively handled by MobileSidebar's drawer above.
              Having two instances causes IntersectionObserver to fire twice,
              making activeId jump incorrectly.
            */}

            <MarkdownRender
              content={fixedContent}
              category={category}
              wikiArticleDir={wikiArticleDir}
              bu={contentBu}
            />
          </div>

          {/* Desktop sticky TOC — xl and up only */}
          <div className="hidden xl:block shrink-0 self-start sticky top-24">
            <TableOfContents />
          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}