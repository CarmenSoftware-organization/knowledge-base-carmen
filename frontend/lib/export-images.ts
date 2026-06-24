/**
 * Image-handling helper for server-side document export (DOCX), with SSRF
 * protection.
 *
 * It processes the `<img>` tags of attacker-supplied HTML and consults an
 * injected url-safety check (in production: {@link isUrlSafe} from ./ssrf-guard)
 * before any server-side fetch. Images whose target is unsafe are stripped.
 */

export type UrlSafetyCheck = (url: string) => Promise<boolean>;

type Classified =
  | { kind: "keep" } // data:/blob: — not a network fetch, leave untouched
  | { kind: "http"; url: string } // absolute http(s) URL to validate
  | { kind: "strip" }; // anything else — unsafe/unsupported scheme

function classify(src: string, baseUrl: string): Classified {
  if (/^(data:|blob:)/i.test(src)) return { kind: "keep" };
  if (src.startsWith("/")) return { kind: "http", url: `${baseUrl}${src}` };
  if (/^https?:\/\//i.test(src)) return { kind: "http", url: src };
  return { kind: "strip" };
}

type Decision = { keep: false } | { keep: true; src: string };

/**
 * Rewrite every `<img>` tag in `html` via `decide`. A tag whose decision is
 * `{ keep: false }` is removed entirely; otherwise its `src` is replaced.
 * Tags without a `src` are left untouched. Offsets are used so duplicate tags
 * and ordering are handled correctly.
 */
async function rewriteImgTags(
  html: string,
  decide: (src: string) => Promise<Decision>
): Promise<string> {
  const matches = [...html.matchAll(/<img\b[^>]*>/gi)];
  const edits = await Promise.all(
    matches.map(async (m) => {
      const tag = m[0];
      const start = m.index ?? 0;
      const end = start + tag.length;
      const srcMatch = tag.match(/\bsrc="([^"]*)"/i);
      if (!srcMatch) return { start, end, replacement: tag };
      const decision = await decide(srcMatch[1]);
      if (!decision.keep) return { start, end, replacement: "" };
      const replacement =
        decision.src === srcMatch[1] ? tag : tag.replace(srcMatch[0], `src="${decision.src}"`);
      return { start, end, replacement };
    })
  );

  let out = "";
  let cursor = 0;
  for (const e of edits.sort((a, b) => a.start - b.start)) {
    out += html.slice(cursor, e.start) + e.replacement;
    cursor = e.end;
  }
  return out + html.slice(cursor);
}

/**
 * DOCX: resolve relative image srcs to absolute URLs and strip any `<img>`
 * whose host is unsafe, before handing the HTML to a library that fetches the
 * images itself (html-to-docx). data:/blob: images are left untouched.
 */
export function rewriteAndFilterImages(
  html: string,
  baseUrl: string,
  isSafe: UrlSafetyCheck
): Promise<string> {
  return rewriteImgTags(html, async (src) => {
    const c = classify(src, baseUrl);
    if (c.kind === "keep") return { keep: true, src };
    if (c.kind === "strip") return { keep: false };
    return (await isSafe(c.url)) ? { keep: true, src: c.url } : { keep: false };
  });
}

