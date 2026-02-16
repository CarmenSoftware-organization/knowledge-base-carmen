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

  const path = `${category}/${article}.md`;

  let raw;

  try {
    raw = await getContent(path);
  } catch {
    notFound();
  }

  //  Parse Frontmatter
  const { data: frontmatter, content } = matter(raw.content);

  const title =
    typeof frontmatter.title === "string"
      ? frontmatter.title
      : raw.title;

  const tags =
    typeof frontmatter.tags === "string"
      ? frontmatter.tags.split(",").map((t: string) => t.trim())
      : Array.isArray(frontmatter.tags)
        ? frontmatter.tags
        : [];

  const publishedAt =
    typeof frontmatter.date === "string"
      ? frontmatter.date
      : null;

  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : null;

  const contentString = content.toString();
  const fixedContent = contentString.replace(/\n##/g, "\n\n##");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <style dangerouslySetInnerHTML={{
        __html: `
        html { scroll-behavior: smooth !important; }
      `}} />
      <KBHeader />
      <MobileSidebar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10 flex gap-10 items-start">
          <KBSidebar />

          <div className="flex-1 max-w-4xl">

            {/* Breadcrumb */}
            <Breadcrumb
              items={[
                { label: "หมวดหมู่", href: "/categories" },
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
              formattedDate={formattedDate}
              tags={tags}
            />

            <div className="border-b mb-8"></div>

            {/* Markdown Render */}
            <MarkdownRender
              content={fixedContent}
              category={category}
            />

          </div>
          <TableOfContents />
        </div>
      </main>

      <KBFooter />
    </div>
  );
}