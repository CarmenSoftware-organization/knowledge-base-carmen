import { useLoaderData } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { parseFrontmatter } from "@/lib/frontmatter";
import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { FaqSidebar } from "@/components/kb/faq-sidebar";
import { ChangelogSidebar } from "@/components/kb/changelog-sidebar";
import { ArticleHeaderInfo } from "@/components/kb/article/article-header-info";
import { MarkdownRender } from "@/components/kb/article/markdown-content";
import { TableOfContents } from "@/components/kb/toc";
import {
  getContent,
  getSelectedBUClient,
  getCategory,
  normalizeWikiRelPath,
  wikiDirFromContentPath,
} from "@/lib/wiki-api";
import { getLocaleFromClient } from "@/lib/locale";
import { formatCategoryName } from "@/lib/wiki-utils";
import { faqSegmentLabel } from "@/lib/faq-nav";
import { getCachedFaqNavItems } from "@/lib/faq-cache";
import { buildChangelogNavList } from "@/lib/changelog-utils";
import { DEFAULT_BU } from "@/lib/config";
import { useTranslations } from "@/i18n/use-translations";

/* -------------------------
   Helper
------------------------- */

function humanizeSegment(seg: string): string {
  try {
    return decodeURIComponent(seg).replace(/-/g, " ").replace(/_/g, " ");
  } catch {
    return seg.replace(/-/g, " ").replace(/_/g, " ");
  }
}

/* -------------------------
   Loader discriminated union
------------------------- */

type ArticleLoaderMissing = {
  status: "missing";
  category: string;
};

type ArticleLoaderOk = {
  status: "ok";
  category: string;
  articleSegments: string[];
  bu: string;
  contentBu: string;
  locale: string;
  catLower: string;
  isFaqArticle: boolean;
  isChangelogArticle: boolean;
  faqNavItems: Awaited<ReturnType<typeof getCachedFaqNavItems>>;
  changelogNavItems: ReturnType<typeof buildChangelogNavList>;
  title: string;
  description: string | undefined;
  editor: string | undefined;
  tags: string[];
  publishedAt: string | undefined;
  formattedDate: string | null;
  fixedContent: string;
  wikiArticleDir: string;
};

export type ArticleLoaderData = ArticleLoaderMissing | ArticleLoaderOk;

export async function articleLoader({
  params,
}: LoaderFunctionArgs): Promise<ArticleLoaderData> {
  const category = params.category as string | undefined;
  const articleSegments = (params["*"] ?? "").split("/").filter(Boolean);

  if (!category || !articleSegments.length) {
    throw new Response(null, { status: 404 });
  }

  const bu = getSelectedBUClient();
  const cookieLocale = getLocaleFromClient();
  const isChangelogCategory = category.toLowerCase() === "changelog";
  const contentBu = isChangelogCategory ? DEFAULT_BU : bu;
  const locale = isChangelogCategory ? "en" : cookieLocale;

  const relBase = normalizeWikiRelPath([category, ...articleSegments].join("/"));
  const primaryPath = `${relBase}.md`;
  const folderIndexPath = `${relBase}/index.md`;
  const catLower = category.toLowerCase();

  let raw: Awaited<ReturnType<typeof getContent>>;
  try {
    raw = await getContent(primaryPath, contentBu, locale, { cache: "no-store" });
  } catch {
    try {
      raw = await getContent(folderIndexPath, contentBu, locale, {
        cache: "no-store",
      });
    } catch {
      if (catLower !== "faq" && catLower !== "changelog") {
        return { status: "missing", category };
      }
      throw new Response(null, { status: 404 });
    }
  }

  const isFaqArticle = catLower === "faq";
  const isChangelogArticle = catLower === "changelog";
  const faqNavItems = isFaqArticle ? await getCachedFaqNavItems(bu) : [];

  let changelogNavItems: ReturnType<typeof buildChangelogNavList> = [];
  if (isChangelogArticle) {
    try {
      const cat = await getCategory("changelog", contentBu, {
        cache: "no-store",
      });
      changelogNavItems = buildChangelogNavList(cat.items);
    } catch {
      changelogNavItems = [];
    }
  }

  const { data: frontmatter, content } = parseFrontmatter(raw.content);

  const title =
    typeof frontmatter.title === "string" ? frontmatter.title : raw.title;

  const description =
    typeof frontmatter.description === "string"
      ? frontmatter.description
      : raw.description;

  const editor =
    typeof frontmatter.editor === "string" ? frontmatter.editor : raw.editor;

  const tags: string[] =
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

  const fixedContent = content.toString().replace(/\n##/g, "\n\n##");

  const wikiArticleDir = raw.path
    ? wikiDirFromContentPath(raw.path)
    : articleSegments.length > 1
      ? `${category}/${articleSegments.slice(0, -1).join("/")}`
      : category;

  return {
    status: "ok",
    category,
    articleSegments,
    bu,
    contentBu,
    locale,
    catLower,
    isFaqArticle,
    isChangelogArticle,
    faqNavItems,
    changelogNavItems,
    title,
    description,
    editor,
    tags,
    publishedAt,
    formattedDate,
    fixedContent,
    wikiArticleDir,
  };
}

/* -------------------------
   Component
------------------------- */

export default function Article() {
  const data = useLoaderData() as ArticleLoaderData;
  const t = useTranslations();

  /* --- Missing content fallback --- */
  if (data.status === "missing") {
    const { category } = data;
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
                  {
                    label: formatCategoryName(category),
                    href: `/categories/${encodeURIComponent(category)}`,
                  },
                  { label: "ไม่มีข้อมูล" },
                ]}
              />
              <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
                <p className="text-base font-semibold text-foreground">
                  ไม่มีเนื้อหาคู่มือ
                </p>
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

  /* --- Success render --- */
  const {
    category,
    articleSegments,
    contentBu,
    catLower,
    isFaqArticle,
    isChangelogArticle,
    faqNavItems,
    changelogNavItems,
    title,
    description,
    editor,
    tags,
    formattedDate,
    fixedContent,
    wikiArticleDir,
  } = data;

  /* Build breadcrumb items in component (needs t()) */
  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: t("common.categories"), href: "/categories" },
  ];

  if (catLower === "faq") {
    breadcrumbItems.push({
      label: formatCategoryName(category),
      href: "/faq",
    });
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
      <MobileSidebar
        faqItems={
          isFaqArticle && faqNavItems.length > 0 ? faqNavItems : undefined
        }
        changelogItems={
          isChangelogArticle && changelogNavItems.length > 0
            ? changelogNavItems
            : undefined
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

          {isChangelogArticle && changelogNavItems.length > 0 && (
            <div className="hidden xl:block shrink-0 self-start sticky top-24">
              <ChangelogSidebar items={changelogNavItems} />
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

            <MarkdownRender
              content={fixedContent}
              category={category}
              wikiArticleDir={wikiArticleDir}
              bu={contentBu}
            />
          </div>

          <div className="hidden xl:block shrink-0 self-start sticky top-24">
            <TableOfContents />
          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}
