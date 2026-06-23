import { useLoaderData } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import matter from "gray-matter";
import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { FaqSidebar } from "@/components/kb/faq-sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { ArticleGridTransition } from "@/components/kb/article-grid-client";
import { FaqFolderGrid } from "@/components/kb/faq-folder-grid";
import { MarkdownRender } from "@/components/kb/article/markdown-content";
import { getCategory, getContent, getSelectedBUClient } from "@/lib/wiki-api";
import { getLocaleFromClient } from "@/lib/locale";
import {
  buildFaqNav,
  faqIndexTitlesByFolderKey,
  faqSegmentLabel,
} from "@/lib/faq-nav";
import type { FaqWikiItem } from "@/lib/faq-nav";
import { useTranslations } from "@/i18n/use-translations";

const FAQ_SLUG = "faq";

function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+.+\n+/, "");
}

/* -------------------------
   Loader type
------------------------- */

export type FaqPathLoaderData = {
  bu: string;
  pathSegments: string[];
  items: FaqWikiItem[];
  folders: ReturnType<typeof buildFaqNav>["folders"];
  articles: ReturnType<typeof buildFaqNav>["articles"];
  categoryName: string;
  dynamicCrumbs: { label: string; href?: string }[];
  leafTitle: string;
  indexContent: {
    data: Record<string, unknown>;
    content: string;
  } | null;
};

export async function faqPathLoader({
  params,
  request: _request,
}: LoaderFunctionArgs): Promise<FaqPathLoaderData> {
  const rawSplat = params["*"] ?? "";
  const pathSegments = rawSplat
    .split("/")
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });

  if (!pathSegments.length) {
    throw new Response(null, { status: 404 });
  }

  const bu = getSelectedBUClient();
  const locale = getLocaleFromClient();

  let data: Awaited<ReturnType<typeof getCategory>>;
  let indexContent: { data: Record<string, unknown>; content: string } | null =
    null;

  try {
    data = await getCategory(FAQ_SLUG, bu, { cache: "no-store" });
    try {
      const indexRel = `${FAQ_SLUG}/${pathSegments.join("/")}/index.md`;
      const rawIndex = await getContent(indexRel, bu, locale, {
        cache: "no-store",
      });
      if (rawIndex) {
        const parsed = matter(rawIndex.content);
        indexContent = {
          data: parsed.data as Record<string, unknown>,
          content: parsed.content,
        };
      }
    } catch {
      indexContent = null;
    }
  } catch {
    throw new Response(null, { status: 404 });
  }

  const nav = buildFaqNav(pathSegments, data.items as FaqWikiItem[]);
  const folderIndexTitles = faqIndexTitlesByFolderKey(
    data.items as FaqWikiItem[],
  );
  const categoryName = data.title?.trim() || "FAQ";
  const leafKey = pathSegments.join("/");
  const leafTitle =
    folderIndexTitles.get(leafKey) ||
    faqSegmentLabel(pathSegments[pathSegments.length - 1] ?? "");

  /* Build only dynamic (per-path-segment) crumbs here — the static translated
     crumbs are prepended in the component where t() is available. */
  const dynamicCrumbs: { label: string; href?: string }[] = [];

  for (let i = 0; i < pathSegments.length; i++) {
    const crumbKey = pathSegments.slice(0, i + 1).join("/");
    const labelFromFolderIndex = folderIndexTitles.get(crumbKey);
    const label =
      labelFromFolderIndex || faqSegmentLabel(pathSegments[i] ?? "");
    const isLast = i === pathSegments.length - 1;
    if (isLast) {
      const titleFromIndex =
        indexContent && typeof indexContent.data.title === "string"
          ? indexContent.data.title
          : null;
      dynamicCrumbs.push({ label: titleFromIndex || label });
    } else {
      const href = `/faq/${pathSegments
        .slice(0, i + 1)
        .map((s) => encodeURIComponent(s))
        .join("/")}`;
      dynamicCrumbs.push({ label, href });
    }
  }

  return {
    bu,
    pathSegments,
    items: data.items as FaqWikiItem[],
    folders: nav.folders,
    articles: nav.articles,
    categoryName,
    dynamicCrumbs,
    leafTitle,
    indexContent,
  };
}

/* -------------------------
   Component
------------------------- */

export default function FaqPath() {
  const data = useLoaderData() as FaqPathLoaderData;
  const t = useTranslations();

  const {
    bu,
    pathSegments,
    items,
    folders,
    articles,
    categoryName,
    dynamicCrumbs,
    leafTitle,
    indexContent,
  } = data;

  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: t("common.categories"), href: "/categories" },
    { label: categoryName, href: "/faq" },
    ...dynamicCrumbs,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      <MobileSidebar faqItems={items} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex gap-8 lg:gap-10 items-start">
          <FaqSidebar items={items} />
          <div className="flex-1 min-w-0 w-full">
            <Breadcrumb items={breadcrumbItems} />

            <div className="mt-6 mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
                FAQ
              </p>
              <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                {indexContent && typeof indexContent.data.title === "string"
                  ? indexContent.data.title
                  : leafTitle}
              </h1>
              {indexContent &&
              typeof indexContent.data.description === "string" &&
              indexContent.data.description ? (
                <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
                  {indexContent.data.description}
                </p>
              ) : null}
            </div>

            {indexContent && (
              <div className="mt-4 mb-8">
                <MarkdownRender
                  content={stripLeadingH1(
                    indexContent.content.toString(),
                  ).replace(/\n##/g, "\n\n##")}
                  category={FAQ_SLUG}
                  wikiArticleDir={`${FAQ_SLUG}/${pathSegments.join("/")}`}
                  bu={bu}
                />
              </div>
            )}

            {folders.length > 0 && (
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
                <FaqFolderGrid folders={folders} pathPrefix={pathSegments} />
              </>
            )}

            {articles.length > 0 && (
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
                <ArticleGridTransition items={articles} />
              </>
            )}

            {folders.length === 0 && articles.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center mb-10">
                <p className="text-base font-semibold text-foreground">
                  ไม่มีข้อมูล
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  ยังไม่มีหมวดหรือบทความ FAQ ในส่วนนี้
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}
