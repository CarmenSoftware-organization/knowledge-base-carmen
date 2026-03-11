"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import remarkEmoji from "remark-emoji";
import { useEffect, useRef } from "react";
import { getSelectedBUClient } from "@/lib/wiki-api";

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

function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = (await import("mermaid")).default;
      const isDark = document.documentElement.classList.contains("dark");
      mermaid.initialize({
        startOnLoad: false,
       theme: isDark ? "dark" : "default",
      });

      if (!ref.current || cancelled) return;

      const id = "mermaid-" + Math.random().toString(36).slice(2);

      try {
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = `<pre>${chart}</pre>`;
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [chart]);

  return (
    <div
      ref={ref}
      className="my-6 flex justify-center overflow-x-auto rounded-xl border border-border p-4 bg-muted/30"
    />
  );
}

export function MarkdownRender({ content, category }: MarkdownRenderProps) {
  return (
    <article
      className="
        prose prose-lg max-w-none
        bg-card text-foreground
        p-8 rounded-xl shadow-sm border border-border
        prose-headings:scroll-mt-24
        prose-ol:list-decimal prose-ol:ml-6 prose-ol:space-y-2
        prose-ul:list-disc prose-ul:ml-6 prose-ul:space-y-2
        prose-li:my-1 prose-li:leading-7
        prose-table:my-6 prose-table:text-sm
        prose-a:text-primary hover:prose-a:underline
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkEmoji]}
        rehypePlugins={[rehypeRaw, rehypeSlug, rehypeHighlight]}
        components={{

          code: ({ className, children }) => {
            const code = String(children).trim();

            if (className?.includes("mermaid")) {
              return <MermaidDiagram chart={code} />;
            }

            return <code className={className}>{children}</code>;
          },

          h1: ({ children, ...props }) => (
            <h1 {...props} className="text-3xl font-bold mt-1 mb-6 border-b border-border pb-3">
              {children}
            </h1>
          ),

          h2: ({ children, ...props }) => (
            <h2 {...props} className="text-2xl font-semibold mt-1 mb-4 border-b border-border pb-2 scroll-mt-24">
              {children}
            </h2>
          ),

          h3: ({ children, ...props }) => (
            <h3 {...props} className="text-xl font-semibold mt-8 mb-3">
              {children}
            </h3>
          ),

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
                      allowFullScreen
                      title="YouTube video player"
                    />
                  </div>
                );
              }
            }

            return <p className="leading-7 my-3 text-muted-foreground">{children}</p>;
          },

          a: ({ href = "", children, ...props }) => {
            const videoId = extractYoutubeId(href);

            if (videoId) {
              return (
                <span className="block my-6 w-full aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    className="w-full h-full rounded-xl shadow-md"
                    allowFullScreen
                    title="YouTube video player"
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
                className="text-primary underline hover:opacity-80"
              >
                {children}
              </a>
            );
          },

          ol: ({ children, ...props }) => (
            <ol {...props} className="list-decimal ml-6 space-y-2">
              {children}
            </ol>
          ),

          ul: ({ children }) => (
            <ul className="list-disc ml-6 space-y-2">{children}</ul>
          ),

          img: ({ src, alt = "", ...props }) => {
            if (!src || typeof src !== "string") return null;
            const cleanSrc = src.replace("./", "");
            const bu = getSelectedBUClient() || "carmen";
            return (
              <img
                {...props}
                src={`http://localhost:8080/wiki-assets/${category}/${cleanSrc}?bu=${bu}`}
                alt={alt}
                className="block rounded-xl my-6 shadow-md max-w-full"
              />
            );
          },

          table: ({ children }) => (
            <div className="overflow-x-auto my-6">
              <table className="w-full border border-border text-sm">{children}</table>
            </div>
          ),

          th: ({ children }) => (
            <th className="border border-border px-3 py-2 bg-muted text-left font-medium">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="border border-border px-3 py-2">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}