import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { getContent } from "@/lib/wiki-api";
import { formatCategoryName } from "@/lib/wiki-utils";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import { TableOfContents } from "@/components/kb/toc";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { ArticleHeaderInfo } from "@/components/kb/article/article-header-info";
import { MarkdownRender } from "@/components/kb/article/markdown-content";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{
    category: string;
    article: string;
  }>;
};

export default async function ArticlePage({ params }: Props) {
  const { category, article } = await params;

  if (!category || !article) {
    notFound();
  }

  const cookieStore = await cookies();
  const bu = cookieStore.get("selected_bu")?.value || "carmen";
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "th";

  const path = `${category}/${article}.md`;

  let raw;

  try {
    raw = await getContent(path, bu, locale);
  } catch {
    notFound();
  }

  //  Parse Frontmatter
  const { data: frontmatter, content } = matter(raw.content);

  const title =
    typeof frontmatter.title === "string"
      ? frontmatter.title
      : raw.title;

  const description =
    typeof frontmatter.description === "string"
      ? frontmatter.description
      : raw.description;

  const editor =
    typeof frontmatter.editor === "string"
      ? frontmatter.editor
      : raw.editor;

  const tags =
    typeof frontmatter.tags === "string"
      ? frontmatter.tags.split(",").map((t: string) => t.trim())
      : Array.isArray(frontmatter.tags)
        ? frontmatter.tags
        : (raw.tags || []);

  const publishedAt =
    typeof frontmatter.date === "string"
      ? frontmatter.date
      : raw.publishedAt;

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

  const t = await getTranslations();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      {/* MobileSidebar shows only on mobile/tablet via its own internal logic */}
      <MobileSidebar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex gap-10 items-start">

          {/* Desktop Sidebar — hidden on mobile & tablet, visible on xl+ */}
          <div className="hidden xl:block shrink-0">
            <KBSidebar />
          </div>

          {/* Main Article Content */}
          <div className="flex-1 min-w-0 w-full max-w-4xl">

            {/* Breadcrumb */}
            <Breadcrumb
              items={[
                { label: t("common.categories"), href: "/categories" },
                {
                  label: formatCategoryName(category),
                  href: `/categories/${category}`,
                },
                { label: title },
              ]}
            />

            {/* Title Content */}
            <ArticleHeaderInfo
              title={title}
              description={description}
              formattedDate={formattedDate}
              tags={tags}
              editor={editor}
            />

            {/* Divider */}
            <div className="border-b border-border mb-8"></div>

            {/* Table of Contents inline — shown only on mobile & tablet (below xl) */}
            <div className="block xl:hidden mb-8">
              <TableOfContents />
            </div>

            {/* Markdown Render */}
            <MarkdownRender
              content={fixedContent}
              category={category}
            />

          </div>

          {/* Desktop Table of Contents — hidden on mobile & tablet, visible on xl+ */}
          <div className="hidden xl:block shrink-0">
            <TableOfContents />
          </div>

        </div>
      </main>

      <KBFooter />
    </div>
  );
}