import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { getContent } from "@/lib/wiki-api";
import { formatCategoryName } from "@/lib/wiki-utils";
import { notFound } from "next/navigation";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import matter from "gray-matter";

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

  // 🔥 Parse Frontmatter
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

  const fixedContent = content.replace(/\n##/g, "\n\n##");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <KBHeader />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10 flex gap-10">
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

            {/* Title */}
            <h1 className="text-4xl font-bold mt-6 mb-4 text-gray-900">
              {title}
            </h1>

            {/* Meta */}
            {(formattedDate || tags.length > 0) && (
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-600">
                {formattedDate && (
                  <div>📅 {formattedDate}</div>
                )}

                {tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="border-b mb-8"></div>

            {/* Markdown Content */}
            <article
              className="
    prose prose-lg max-w-none
    bg-white p-8 rounded-xl shadow-sm

    prose-headings:scroll-mt-24

    prose-ol:list-decimal
    prose-ol:ml-6
    prose-ol:space-y-2

    prose-ul:list-disc
    prose-ul:ml-6
    prose-ul:space-y-2

    prose-li:my-1
    prose-li:leading-7

    prose-table:my-6
    prose-table:text-sm

    prose-a:text-blue-600
    prose-a:no-underline
    hover:prose-a:underline
  "
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[
                  rehypeRaw,
                  rehypeSlug,
                  rehypeHighlight,
                ]}
                components={{

                  /* ---------------- HEADINGS ---------------- */

                  h1: ({ children, ...props }) => (
                    <h1
                      {...props}
                      className="text-3xl font-bold mt-1 mb-6 border-b border-gray-300 pb-3"
                    >
                      {children}
                    </h1>
                  ),


                  h2: ({ children, ...props }) => (
                    <h2
                      {...props}
                      className="text-2xl font-semibold mt-10 mb-4 border-b border-gray-200 pb-2"
                    >
                      {children}
                    </h2>
                  ),

                  h3: ({ children, ...props }) => (
                    <h3
                      {...props}
                      className="text-xl font-semibold mt-8 mb-3"
                    >
                      {children}
                    </h3>
                  ),

                  /* ---------------- LIST FIX (รองรับ nested) ---------------- */

                  ol: ({ children, ...props }) => (
                    <ol
                      {...props}
                      className="list-decimal ml-6 space-y-2"
                    >
                      {children}
                    </ol>
                  ),

                  ul: ({ children, ...props }) => (
                    <ul
                      {...props}
                      className="list-disc ml-6 space-y-2"
                    >
                      {children}
                    </ul>
                  ),

                  li: ({ children, ...props }) => (
                    <li
                      {...props}
                      className="
            pl-1
            marker:font-medium
            marker:text-gray-600
          "
                    >
                      {children}
                    </li>
                  ),

                  /* ---------------- IMAGE FIX (แยก inline/block) ---------------- */

                  img: ({ src, alt = "", ...props }) => {
                    if (!src || typeof src !== "string") return null;

                    const cleanSrc = src.replace("./", "");

                    const isInline = props?.style?.display === "inline-block";

                    return (
                      <img
                        {...props}
                        src={`http://localhost:8080/wiki-assets/${category}/${cleanSrc}`}
                        alt={alt}
                        className={
                          isInline
                            ? "inline-block align-middle mx-1"
                            : "block rounded-xl my-6 shadow-md max-w-full"
                        }
                      />
                    );
                  },


                  /* ---------------- LINK AUTO RENDER ---------------- */

                  a: ({ href = "", children, ...props }) => {
                    if (!href) return <a {...props}>{children}</a>;

                    // 🎥 YouTube Preview
                    const youtubeMatch =
                      href.match(
                        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
                      );

                    if (youtubeMatch) {
                      const videoId = youtubeMatch[1];

                      return (
                        <div className="my-6 aspect-video">
                          <iframe
                            className="w-full h-full rounded-xl shadow-md"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="YouTube video"
                            allowFullScreen
                          />
                        </div>
                      );
                    }

                    // 🌐 Normal external link
                    return (
                      <a
                        {...props}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {children}
                      </a>
                    );
                  },


                  /* ---------------- TABLE ---------------- */

                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6">
                      <table className="w-full border border-gray-200 text-sm">
                        {children}
                      </table>
                    </div>
                  ),

                  th: ({ children }) => (
                    <th className="border px-3 py-2 bg-gray-100 text-left font-medium">
                      {children}
                    </th>
                  ),

                  td: ({ children }) => (
                    <td className="border px-3 py-2">
                      {children}
                    </td>
                  ),
                }}
              >
                {fixedContent}
              </ReactMarkdown>
            </article>


          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}
