import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { getContent } from "@/lib/wiki-api";
import { formatCategoryName } from "@/lib/wiki-utils";
import { notFound } from "next/navigation";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

  let data: {
    path: string;
    title: string;
    content: string;
    tags?: string[];
    publishedAt?: string;
  };

  try {
    data = await getContent(path);
  } catch {
    notFound();
  }

  const formattedDate = data.publishedAt
    ? new Date(data.publishedAt).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

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
                { label: data.title },
              ]}
            />

            {/* Title */}
            <h1 className="text-4xl font-bold mt-6 mb-4 text-gray-900">
              {data.title}
            </h1>

            {/* Meta Section */}
            {(formattedDate || data.tags?.length) && (
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-600">

                {formattedDate && (
                  <div>
                    📅 {formattedDate}
                  </div>
                )}

                {data.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="border-b mb-8"></div>

            {/* Content */}
            <article className="prose prose-lg max-w-none bg-white p-8 rounded-xl shadow-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ src = "", alt = "" }) => (
                    <img
                      src={`http://localhost:8080/wiki-assets/${category}/${src}`}
                      alt={alt}
                      className="rounded-xl my-6 shadow-md"
                    />
                  ),
                }}
              >
                {data.content}
              </ReactMarkdown>
            </article>

          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}
