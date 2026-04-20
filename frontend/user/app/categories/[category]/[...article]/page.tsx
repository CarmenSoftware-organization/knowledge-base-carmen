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

  if (!category || !articleSegments?.length) {
    notFound();
  }

  const cookieStore = await cookies();
  const bu = (cookieStore.get("selected_bu")?.value || DEFAULT_BU)
    .trim()
    .toLowerCase();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value || "th";

  const locale = category.toLowerCase() === "changelog" ? "en" : cookieLocale;

  const relBase = normalizeWikiRelPath(
    [category, ...articleSegments].join("/"),
  );
  const primaryPath = `${relBase}.md`;
  const folderIndexPath = `${relBase}/index.md`;

  let raw;
  try {
    raw = await getContent(primaryPath, bu, locale, { cache: "no-store" });
  } catch {
    try {
      raw = await getContent(folderIndexPath, bu, locale, { cache: "no-store" });
    } catch {
      notFound();
    }
  }

  const catLower = category.toLowerCase();
  const isFaqArticle = catLower === "faq";
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
    const label = catLower === "faq" ? faqSegmentLabel(seg) : humanizeSegment(seg);
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
      <MobileSidebar
        faqItems={
          isFaqArticle && faqNavItems.length > 0 ? faqNavItems : undefined
        }
      />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-8 lg:py-10 flex gap-6 sm:gap-8 lg:gap-10 items-start">
          {!isFaqArticle && (
            <div className="hidden xl:block shrink-0">
              <KBSidebar />
            </div>
          )}

          {isFaqArticle && faqNavItems.length > 0 && (
            <FaqSidebar items={faqNavItems} />
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

            <div className="block xl:hidden mb-8">
              <TableOfContents />
            </div>

            <MarkdownRender
              content={fixedContent}
              category={category}
              wikiArticleDir={wikiArticleDir}
              bu={bu}
            />
          </div>

          <div className="hidden xl:block shrink-0">
            <TableOfContents />
          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}
