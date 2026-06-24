import { useLoaderData } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { parseFrontmatter } from "@/lib/frontmatter";
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
import { buildFaqNav } from "@/lib/faq-nav";
import type { FaqWikiItem } from "@/lib/faq-nav";
import { useTranslations } from "@/i18n/use-translations";
import type { ReactNode } from "react";

const FAQ_SLUG = "faq";

function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+.+\n+/, "");
}

function SectionDivider({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  const spacingClass = compact ? "py-2 mb-4" : "py-6 mb-2";
  return (
    <div className={`relative ${spacingClass}`}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
          {children}
        </span>
      </div>
    </div>
  );
}

/* -------------------------
   Loader discriminated union
------------------------- */

type FaqIndexLoaderError = {
  status: "error";
};

type FaqIndexLoaderOk = {
  status: "ok";
  bu: string;
  items: FaqWikiItem[];
  hasFolders: boolean;
  hasArticles: boolean;
  hasNoContent: boolean;
  folders: ReturnType<typeof buildFaqNav>["folders"];
  articles: ReturnType<typeof buildFaqNav>["articles"];
  indexContent: { data: Record<string, unknown>; content: string } | null;
};

export type FaqIndexLoaderData = FaqIndexLoaderError | FaqIndexLoaderOk;

export async function faqLoader(
  _args: LoaderFunctionArgs,
): Promise<FaqIndexLoaderData> {
  const bu = getSelectedBUClient();
  const locale = getLocaleFromClient();

  let data: Awaited<ReturnType<typeof getCategory>>;
  let indexContent: { data: Record<string, unknown>; content: string } | null =
    null;

  try {
    data = await getCategory(FAQ_SLUG, bu, { cache: "no-store" });
    try {
      const rawIndex = await getContent(`${FAQ_SLUG}/index.md`, bu, locale, {
        cache: "no-store",
      });
      if (rawIndex) {
        const parsed = parseFrontmatter(rawIndex.content);
        indexContent = {
          data: parsed.data as Record<string, unknown>,
          content: parsed.content,
        };
      }
    } catch {
      indexContent = null;
    }
  } catch {
    return { status: "error" };
  }

  const faqNav = buildFaqNav([], data.items as FaqWikiItem[]);
  const hasFolders = faqNav.folders.length > 0;
  const hasArticles = faqNav.articles.length > 0;
  const hasNoContent = !hasFolders && !hasArticles;

  return {
    status: "ok",
    bu,
    items: data.items as FaqWikiItem[],
    hasFolders,
    hasArticles,
    hasNoContent,
    folders: faqNav.folders,
    articles: faqNav.articles,
    indexContent,
  };
}

/* -------------------------
   Component
------------------------- */

export default function Faq() {
  const data = useLoaderData() as FaqIndexLoaderData;
  const t = useTranslations();

  /* --- Error fallback (getCategory failed) --- */
  if (data.status === "error") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <KBHeader />
        <MobileSidebar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            <div className="w-full min-w-0">
              <Breadcrumb
                items={[
                  { label: t("common.categories"), href: "/categories" },
                  { label: "FAQ" },
                ]}
              />
              <p className="mt-8 text-sm text-muted-foreground">
                ยังไม่มีโฟลเดอร์ FAQ ใน wiki (หรือโหลดไม่สำเร็จ) — ตรวจสอบว่าใน
                repo มี{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  carmen_cloud/faq/*.md
                </code>{" "}
                และ backend ชี้{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  WIKI_CONTENT_PATH
                </code>{" "}
                ถูกต้อง
              </p>
            </div>
          </div>
        </main>
        <KBFooter />
      </div>
    );
  }

  /* --- Success render --- */
  const {
    bu,
    items,
    hasFolders,
    hasArticles,
    hasNoContent,
    folders,
    articles,
    indexContent,
  } = data;

  const categoryName = "FAQ";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      <MobileSidebar faqItems={items} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex gap-8 lg:gap-10 items-start">
          <FaqSidebar items={items} />
          <div className="flex-1 min-w-0 w-full">
            <Breadcrumb
              items={[
                { label: t("common.categories"), href: "/categories" },
                { label: categoryName },
              ]}
            />

            <div className="mt-6 mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
                FAQ
              </p>
              <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                คำถามที่พบบ่อย — {categoryName}
              </h1>
            </div>

            {indexContent && (
              <div className="mt-4 mb-8">
                <MarkdownRender
                  content={stripLeadingH1(
                    indexContent.content.toString(),
                  ).replace(/\n##/g, "\n\n##")}
                  category={FAQ_SLUG}
                  bu={bu}
                />
              </div>
            )}

            {!indexContent && !hasFolders && (
              <SectionDivider compact>
                {t("category.articlesInCategory")}
              </SectionDivider>
            )}

            {hasFolders && (
              <>
                <SectionDivider>หมวดหมู่</SectionDivider>
                <FaqFolderGrid folders={folders} pathPrefix={[]} />
              </>
            )}

            {hasArticles && (
              <>
                <SectionDivider>{t("category.articlesInCategory")}</SectionDivider>
                <ArticleGridTransition items={articles} />
              </>
            )}

            {hasNoContent && (
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
