/**
 * URL classification/allowlisting helpers used when rendering model- or
 * content-derived URLs. Host and scheme are parsed (never substring-matched),
 * so look-alike hosts and dangerous schemes cannot slip through.
 */

/** True only when the URL's host is a real YouTube host (not a substring of it). */
export function isYoutubeUrl(rawUrl: string): boolean {
  let host: string;
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    host = u.hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be" ||
    host.endsWith(".youtu.be")
  );
}

/** Same-origin-relative path that is NOT protocol-relative (`//host`). */
function isLocalPath(raw: string): boolean {
  return raw.startsWith("/") && !raw.startsWith("//");
}

/**
 * Returns the URL if it is safe to use as an `<img src>` (relative path, http(s),
 * an image data: URI, or blob:), otherwise null. Rejects javascript:, non-image
 * data: URIs, and protocol-relative URLs.
 */
export function safeImageSrc(raw: string): string | null {
  if (isLocalPath(raw)) return raw;
  let proto: string;
  try {
    proto = new URL(raw).protocol;
  } catch {
    return null;
  }
  if (proto === "http:" || proto === "https:" || proto === "blob:") return raw;
  if (proto === "data:" && /^\s*data:image\//i.test(raw)) return raw;
  return null;
}

/**
 * Returns the URL if it is safe to use as a navigable `<a href>` (relative path
 * or http(s) only), otherwise null. Stricter than {@link safeImageSrc}: data:,
 * blob:, javascript:, and protocol-relative URLs are all rejected, since
 * navigating to them can execute script or leave the origin unexpectedly.
 */
export function safeLinkHref(raw: string): string | null {
  if (isLocalPath(raw)) return raw;
  let proto: string;
  try {
    proto = new URL(raw).protocol;
  } catch {
    return null;
  }
  return proto === "http:" || proto === "https:" ? raw : null;
}
