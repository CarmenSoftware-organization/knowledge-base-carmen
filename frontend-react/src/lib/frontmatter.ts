import { load as loadYaml } from "js-yaml";

export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  content: string;
}

/**
 * Matches a leading YAML frontmatter block delimited by `---`, mirroring
 * gray-matter's default behavior. An optional leading BOM (U+FEFF) is allowed.
 * The closing delimiter and its trailing newline are consumed so `content` is
 * the body that follows.
 */
const FRONTMATTER_RE =
  /^(?:\uFEFF)?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Browser-safe replacement for `gray-matter`. gray-matter depends on Node's
 * global `Buffer`, which is undefined in the browser (Vite does not polyfill
 * it), so calling it in a route loader threw "Buffer is not defined" and the
 * article page rendered the 404 error element. This parses the same leading
 * `---` frontmatter block using js-yaml (pure JS, browser-safe) and returns the
 * parsed map plus the remaining content.
 */
export function parseFrontmatter(input: string): ParsedFrontmatter {
  if (typeof input !== "string" || input.length === 0) {
    return { data: {}, content: typeof input === "string" ? input : "" };
  }

  const match = FRONTMATTER_RE.exec(input);
  if (!match) {
    return { data: {}, content: input };
  }

  let data: Record<string, unknown> = {};
  try {
    const loaded = loadYaml(match[1]);
    if (loaded && typeof loaded === "object" && !Array.isArray(loaded)) {
      data = loaded as Record<string, unknown>;
    }
  } catch {
    // Malformed frontmatter: fall back to empty metadata, keep the body intact.
    data = {};
  }

  return { data, content: input.slice(match[0].length) };
}
