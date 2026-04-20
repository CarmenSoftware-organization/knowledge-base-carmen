"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkEmoji from "remark-emoji";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { API_BASE, DEFAULT_BU } from "@/lib/config";
import { extractYoutubeId } from "@/lib/utils";
import { getSelectedBUClient, resolveWikiMarkdownHref } from "@/lib/wiki-api";
import DOMPurify from "dompurify";

interface MarkdownRenderProps {
  content: string;
  category: string;
  wikiArticleDir?: string;
  /** Optional BU from server for image URLs (SSR/hydrate match); else client cookie */
  bu?: string;
}

/** แปลง src ใน md → path สำหรับ /wiki-assets ภายใต้ root ของ BU */
function wikiAssetRelativePath(
  src: string,
  category: string,
  wikiArticleDir?: string,
): string {
  let assetRelative = src.replace("./", "").replace(/^\/+/, "");
  if (assetRelative.startsWith("carmen_cloud/")) {
    assetRelative = assetRelative.slice("carmen_cloud/".length);
  } else if (assetRelative.startsWith("contents/carmen_cloud/")) {
    assetRelative = assetRelative.slice("contents/carmen_cloud/".length);
  } else if (assetRelative.startsWith("contents/carmen/")) {
    assetRelative = assetRelative.slice("contents/carmen/".length);
  } else if (assetRelative.startsWith("carmen/")) {
    assetRelative = assetRelative.slice("carmen/".length);
  }

  // รูปกลางโมดูล: faq/_images/… หรือ ap/_images/… (ไม่ผูกกับโฟลเดอร์ nested ของบทความ)
  if (assetRelative.startsWith("_images/")) {
    if (!assetRelative.startsWith(`${category}/`)) {
      return `${category}/${assetRelative}`;
    }
    return assetRelative;
  }

  if (assetRelative.startsWith(`${category}/`)) {
    return assetRelative;
  }

  const base = (wikiArticleDir || category).replace(/\/+$/, "");
  return `${base}/${assetRelative}`.replace(/\/{2,}/g, "/");
}

function sanitizeImgAlt(alt: string, resolvedSrc: string): string {
  const t = (alt || "").trim();
  if (!t) return "";
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(t)) return "";
  const lastSeg = resolvedSrc.split("/").pop() || "";
  const decoded = (() => {
    try {
      return decodeURIComponent(lastSeg);
    } catch {
      return lastSeg;
    }
  })();
  if (t === lastSeg || t === decoded) return "";
  if (t.length > 100 && (t.includes("/") || t.includes("\\"))) return "";
  return t;
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
        securityLevel: "strict",
      });

      if (!ref.current || cancelled) return;

      const id = "mermaid-" + Math.random().toString(36).slice(2);

      try {
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) {
          const sanitized = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true },
            ADD_TAGS: ["tspan", "textPath", "foreignObject"],
            ADD_ATTR: [
              "x", "y", "dx", "dy", "text-anchor", "lengthAdjust", "textLength",
              "font-family", "font-size", "font-weight", "style", "class",
              "transform", "viewBox", "xmlns", "xmlns:xlink",
            ],
          });
          ref.current.innerHTML = sanitized;
        }
      } catch {
        if (!cancelled && ref.current) {
          const escaped = chart
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
          ref.current.innerHTML = `<pre>${escaped}</pre>`;
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

export function MarkdownRender({
  content,
  category,
  wikiArticleDir,
  bu: buProp,
}: MarkdownRenderProps) {
  return (
    <article
      className="
        prose prose-sm sm:prose-base lg:prose-lg max-w-none
        bg-card text-foreground
        p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl shadow-sm border border-border
        prose-headings:scroll-mt-20 sm:prose-headings:scroll-mt-24 lg:prose-headings:scroll-mt-28
        prose-p:text-sm sm:prose-p:text-base prose-p:leading-relaxed
        prose-ol:list-decimal prose-ol:ml-4 sm:prose-ol:ml-6 prose-ol:space-y-1.5 sm:prose-ol:space-y-2
        prose-ul:list-disc prose-ul:ml-4 sm:prose-ul:ml-6 prose-ul:space-y-1.5 sm:prose-ul:space-y-2
        prose-li:my-0.5 sm:prose-li:my-1 prose-li:text-sm sm:prose-li:text-base prose-li:leading-relaxed sm:prose-li:leading-7
        prose-table:my-4 sm:prose-table:my-6 prose-table:text-xs sm:prose-table:text-sm
        prose-a:text-primary hover:prose-a:underline
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkEmoji]}
        rehypePlugins={[
          rehypeRaw,
          [
            rehypeSanitize,
            {
              ...defaultSchema,
              attributes: {
                ...defaultSchema.attributes,
                code: [
                  ...(defaultSchema.attributes?.code || []),
                  ["className"],
                ],
                span: [
                  ...(defaultSchema.attributes?.span || []),
                  ["className"],
                ],
                img: [
                  ...(defaultSchema.attributes?.img || []),
                  "src",
                  "alt",
                  "title",
                  "width",
                  "height",
                  ["className"],
                ],
              },
              protocols: {
                ...defaultSchema.protocols,
                src: ["http", "https", "data"],
              },
            },
          ],
          rehypeSlug,
          rehypeHighlight,
        ]}
        components={{

          code: ({ className, children }) => {
            const code = String(children).trim();

            if (className?.includes("mermaid")) {
              return <MermaidDiagram chart={code} />;
            }

            return <code className={className}>{children}</code>;
          },

          h1: ({ children, ...props }) => (
            <h1
              {...props}
              className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 mb-4 sm:mb-6 border-b border-border pb-2 sm:pb-3 scroll-mt-20 sm:scroll-mt-24"
            >
              {children}
            </h1>
          ),

          h2: ({ children, ...props }) => (
            <h2
              {...props}
              className="text-lg sm:text-xl md:text-2xl font-semibold mt-6 sm:mt-8 mb-3 sm:mb-4 border-b border-border pb-1.5 sm:pb-2 scroll-mt-20 sm:scroll-mt-24"
            >
              {children}
            </h2>
          ),

          h3: ({ children, ...props }) => (
            <h3 {...props} className="text-base sm:text-lg md:text-xl font-semibold mt-6 sm:mt-8 mb-2 sm:mb-3 scroll-mt-20 sm:scroll-mt-24">
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
              const videoId = extractYoutubeId(child?.props?.href ?? "");

              if (videoId) {

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

            return (
              <p className="my-2 sm:my-3 text-sm sm:text-base leading-relaxed sm:leading-7 text-muted-foreground">
                {children}
              </p>
            );
          },

          a: ({ href = "", children, node: _node, ...props }) => {
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

            const resolved = resolveWikiMarkdownHref(
              href,
              wikiArticleDir,
              category,
            );
            const isInternal =
              resolved.startsWith("/categories/") ||
              resolved.startsWith("/faq") ||
              resolved.startsWith("/search");
            const isHashOnly = href.trim().startsWith("#");

            if (isInternal || isHashOnly) {
              return (
                <Link
                  {...props}
                  href={resolved}
                  className="text-primary underline hover:opacity-80"
                >
                  {children}
                </Link>
              );
            }

            return (
              <a
                {...props}
                href={resolved}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:opacity-80"
              >
                {children}
              </a>
            );
          },

          ol: ({ children, ...props }) => (
            <ol {...props} className="list-decimal ml-4 sm:ml-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base pl-0.5">
              {children}
            </ol>
          ),

          ul: ({ children }) => (
            <ul className="list-disc ml-4 sm:ml-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base pl-0.5">
              {children}
            </ul>
          ),

          img: ({ src, alt = "", title, ...props }) => {
            if (!src || typeof src !== "string") return null;
            const bu =
              (buProp?.trim() && buProp.trim().toLowerCase()) ||
              getSelectedBUClient() ||
              DEFAULT_BU;

            // Absolute http(s) / data — leave as-is
            if (/^(https?:|data:)/i.test(src)) {
              return (
                <img
                  {...props}
                  src={src}
                  alt={alt}
                  title={title}
                  className="block rounded-xl my-6 shadow-md max-w-full"
                />
              );
            }

            const assetRelative = wikiAssetRelativePath(
              src,
              category,
              wikiArticleDir,
            );
            const displayAlt = sanitizeImgAlt(String(alt), assetRelative);
            const titleStr = title != null ? String(title) : undefined;
            const displayTitle =
              titleStr && !sanitizeImgAlt(titleStr, assetRelative) ? undefined : titleStr;

            const qs = new URLSearchParams({ bu });
            const url = `${API_BASE}/wiki-assets/${assetRelative
              .split("/")
              .map((seg) => encodeURIComponent(seg))
              .join("/")}?${qs.toString()}`;

            return (
              <img
                {...props}
                src={url}
                alt={displayAlt}
                title={displayTitle}
                loading="lazy"
                className="block rounded-xl my-6 shadow-md max-w-full"
              />
            );
          },

          table: ({ children }) => (
            <div className="overflow-x-auto my-4 sm:my-6 -mx-1 px-1 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[16rem] border border-border text-xs sm:text-sm">{children}</table>
            </div>
          ),

          th: ({ children }) => (
            <th className="border border-border px-2 py-1.5 sm:px-3 sm:py-2 bg-muted text-left font-medium">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="border border-border px-2 py-1.5 sm:px-3 sm:py-2">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}