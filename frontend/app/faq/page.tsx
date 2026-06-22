import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { FaqSidebar } from "@/components/kb/faq-sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { getCategory, getContent } from "@/lib/wiki-api";
import { ArticleGridTransition } from "@/components/kb/article-grid-client";
import { FaqFolderGrid } from "@/components/kb/faq-folder-grid";
import { buildFaqNav } from "@/lib/faq-nav";
import { MarkdownRender } from "@/components/kb/article/markdown-content";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import matter from "gray-matter";
import { DEFAULT_BU } from "@/lib/config";
import type { ReactNode } from "react";

const FAQ_SLUG = "faq";

function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+.+\n+/, "");
}

function SectionDivider({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
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

async function loadFaqIndexContent(bu: string, locale: string): Promise<ReturnType<typeof matter> | null> {
  try {
    const rawIndex = await getContent(`${FAQ_SLUG}/index.md`, bu, locale);
    return rawIndex ? matter(rawIndex.content) : null;
  } catch {
    return null;
  }
}

export default async function FAQHomePage() {
  const t = await getTranslations();
  const cookieStore = await cookies();
  const bu = (cookieStore.get("selected_bu")?.value || DEFAULT_BU).trim().toLowerCase();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value || "th";

  let data: Awaited<ReturnType<typeof getCategory>>;
  let indexContent: ReturnType<typeof matter> | null;

  try {
    data = await getCategory(FAQ_SLUG, bu);
    indexContent = await loadFaqIndexContent(bu, cookieLocale);
  } catch {
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

  const categoryName = "FAQ";
  const faqNav = buildFaqNav([], data.items);
  const hasFolders = faqNav.folders.length > 0;
  const hasArticles = faqNav.articles.length > 0;
  const hasNoContent = !hasFolders && !hasArticles;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      <MobileSidebar faqItems={data.items} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex gap-8 lg:gap-10 items-start">
          <FaqSidebar items={data.items} />
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
                  content={stripLeadingH1(indexContent.content.toString()).replace(
                    /\n##/g,
                    "\n\n##"
                  )}
                  category={FAQ_SLUG}
                  bu={bu}
                />
              </div>
            )}

            {!indexContent && !hasFolders && (
              <SectionDivider compact>{t("category.articlesInCategory")}</SectionDivider>
            )}

            {hasFolders && (
              <>
                <SectionDivider>หมวดหมู่</SectionDivider>
                <FaqFolderGrid folders={faqNav.folders} pathPrefix={[]} />
              </>
            )}

            {hasArticles && (
              <>
                <SectionDivider>{t("category.articlesInCategory")}</SectionDivider>
                <ArticleGridTransition items={faqNav.articles} />
              </>
            )}

            {hasNoContent && (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center mb-10">
                <p className="text-base font-semibold text-foreground">ไม่มีข้อมูล</p>
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
