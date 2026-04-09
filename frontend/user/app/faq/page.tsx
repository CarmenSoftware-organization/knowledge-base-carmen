import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { getCategory, getContent } from "@/lib/wiki-api";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { ArticleGridTransition } from "@/components/kb/article-grid-client";
import { ArticleHeaderInfo } from "@/components/kb/article/article-header-info";
import { MarkdownRender } from "@/components/kb/article/markdown-content";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import matter from "gray-matter";
import { categoryDisplayMap } from "@/configs/sidebar-map";
import { DEFAULT_BU } from "@/lib/config";

const FAQ_SLUG = "faq";

export default async function FAQHomePage() {
  const t = await getTranslations();
  const cookieStore = await cookies();
  const bu = (cookieStore.get("selected_bu")?.value || DEFAULT_BU).trim().toLowerCase();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value || "th";

  let data: Awaited<ReturnType<typeof getCategory>>;
  let indexContent: ReturnType<typeof matter> | null = null;

  try {
    data = await getCategory(FAQ_SLUG, bu);
    try {
      const rawIndex = await getContent(`${FAQ_SLUG}/index.md`, bu, cookieLocale);
      if (rawIndex) {
        indexContent = matter(rawIndex.content);
      }
    } catch {
      indexContent = null;
    }
  } catch {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <KBHeader />
        <MobileSidebar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
            <aside className="hidden md:block w-64 shrink-0">
              <KBSidebar />
            </aside>
            <div className="flex-1">
              <Breadcrumb
                items={[
                  { label: t("common.categories"), href: "/categories" },
                  { label: categoryDisplayMap[FAQ_SLUG] || "FAQ" },
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

  const categoryName = categoryDisplayMap[FAQ_SLUG] || "FAQ";

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
              <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
                รายการดึงจากไฟล์ Markdown ใต้โฟลเดอร์{" "}
                <code className="text-xs bg-muted px-1 rounded">faq/</code> ใน
                repo (เดียวกับหมวดหมู่เอกสาร) — อัปเดตตาม Wiki.js / Git หลัง
                sync
              </p>
            </div>

            {indexContent && (
              <div className="mt-4 mb-8">
                <ArticleHeaderInfo
                  title={(indexContent.data.title as string) || categoryName}
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
                <div className="relative py-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
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
              <div className="relative py-2 mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    {t("category.articlesInCategory")}
                  </span>
                </div>
              </div>
            )}

            <ArticleGridTransition items={data.items} category={FAQ_SLUG} />
          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}
