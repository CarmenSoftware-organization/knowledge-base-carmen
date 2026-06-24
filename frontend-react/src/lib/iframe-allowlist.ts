// Exact-hostname allowlist for embedded iframes rendered from chat/markdown.
const ALLOWED_IFRAME_HOSTS = new Set([
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
]);

/**
 * True only when `src` is an https URL whose hostname EXACTLY matches an allowed
 * embed host. Parses the URL instead of prefix-matching the raw string, so a
 * lookalike like "https://www.youtube.com.evil.com" (which startsWith a trusted
 * origin) is rejected.
 */
export function isAllowedIframeSrc(src: string): boolean {
  let u: URL;
  try {
    u = new URL(src);
  } catch {
    return false;
  }
  return (
    u.protocol === "https:" && ALLOWED_IFRAME_HOSTS.has(u.hostname.toLowerCase())
  );
}
