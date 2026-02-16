"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";

interface MarkdownRenderProps {
  content: string;
  category: string;
}

function extractYoutubeId(url?: string) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export function MarkdownRender({ content, category }: MarkdownRenderProps) {
  return (
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
        rehypePlugins={[rehypeRaw, rehypeSlug, rehypeHighlight]}
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
              className="text-2xl font-semibold mt-1 mb-4 border-b border-gray-200 pb-2 scroll-mt-24"
            >
              {children}
            </h2>
          ),

          h3: ({ children, ...props }) => (
            <h3 {...props} className="text-xl font-semibold mt-8 mb-3">
              {children}
            </h3>
          ),

          /* ---------------- PARAGRAPH FIX (YOUTUBE SAFE) ---------------- */
          p: ({ children }) => {
            if (
              Array.isArray(children) &&
              children.length === 1 &&
              typeof children[0] === "object" &&
              "props" in (children[0] as any)
            ) {
              const child: any = children[0];
              const href = child?.props?.href;

              const youtubeMatch = href?.match(
                /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
              );

              if (youtubeMatch) {
                const videoId = youtubeMatch[1];

                return (
                  <div className="my-6 aspect-video w-full">
                    <iframe
                      className="w-full h-full rounded-xl shadow-md"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="YouTube video"
                      allowFullScreen
                    />
                  </div>
                );
              }
            }

            return <p className="leading-7 my-3">{children}</p>;
          },

          /* ---------------- LINK ---------------- */
          a: ({ href = "", children, ...props }) => {
            const videoId = extractYoutubeId(href);

            if (videoId) {
              return (
                <span className="block my-6 w-full aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video"
                    className="w-full h-full rounded-xl shadow-md"
                    allowFullScreen
                  />
                </span>
              );
            }

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

          /* ---------------- LIST ---------------- */
          ol: ({ children, ...props }) => (
            <ol {...props} className="list-decimal ml-6 space-y-2">
              {children}
            </ol>
          ),

          ul: ({ children }) => (
            <ul className="list-disc ml-6 space-y-2">{children}</ul>
          ),

          li: ({ children, ...props }) => (
            <li
              {...props}
              className="pl-1 marker:font-medium marker:text-gray-600"
            >
              {children}
            </li>
          ),

          /* ---------------- IMAGE ---------------- */
          img: ({ src, alt = "", ...props }) => {
            if (!src || typeof src !== "string") return null;

            const cleanSrc = src.replace("./", "");

            return (
              <img
                {...props}
                src={`http://localhost:8080/wiki-assets/${category}/${cleanSrc}`}
                alt={alt}
                className="block rounded-xl my-6 shadow-md max-w-full"
              />
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

          td: ({ children }) => <td className="border px-3 py-2">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}