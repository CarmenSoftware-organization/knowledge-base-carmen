/**
 * The `googtrans` cookie is the site's entire language state.
 *
 * Google's Website Translator reads this cookie at load and translates the
 * document accordingly. Keeping it as the single source of truth means there
 * is no React state to synchronise, and a reader who clears the cookie by hand
 * correctly lands back on the authored Thai with no code involved.
 *
 * This module knows the cookie format and nothing else — no React, no
 * reference to Google's script. It is the one file to change if the engine is
 * ever replaced.
 */

/** The language the site is authored in; also the cookie's source segment. */
export const TRANSLATE_SOURCE_LANG = "th";

const COOKIE_NAME = "googtrans";

/**
 * Domain attributes to write the cookie on, `""` meaning "omit the attribute".
 *
 * Google's widget reads the cookie from the exact host or from a dot-prefixed
 * parent, so a value written on only one of them can be silently overridden by
 * a stale value on the other. Writing and clearing the same set keeps them
 * consistent. Hosts without dots (localhost) and bare IPs reject a `domain`
 * attribute outright, so they get the single unqualified write.
 */
function cookieDomains(): string[] {
  const host = window.location.hostname;
  if (!host.includes(".") || /^[\d.]+$/.test(host)) return [""];
  const registrable = host.split(".").slice(-2).join(".");
  const domains = ["", `.${host}`];
  if (`.${registrable}` !== `.${host}`) domains.push(`.${registrable}`);
  return domains;
}

/** Current target language, or `TRANSLATE_SOURCE_LANG` when none is active. */
export function getTranslateLang(): string {
  if (typeof document === "undefined") return TRANSLATE_SOURCE_LANG;

  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  if (!match) return TRANSLATE_SOURCE_LANG;

  let raw = match[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // A value we did not write; treat it as malformed below.
  }

  // The value is "/<source>/<target>". Anything else is not ours to interpret.
  const parts = raw.split("/");
  if (parts.length !== 3) return TRANSLATE_SOURCE_LANG;
  return parts[2] || TRANSLATE_SOURCE_LANG;
}

/**
 * Point the cookie at `code`. Passing the source language (or an empty string)
 * clears it instead of writing `/th/th`, which the widget treats
 * inconsistently.
 */
export function setTranslateLang(code: string): void {
  if (typeof document === "undefined") return;
  if (!code || code === TRANSLATE_SOURCE_LANG) {
    clearTranslateLang();
    return;
  }
  const value = `/${TRANSLATE_SOURCE_LANG}/${code}`;
  for (const domain of cookieDomains()) {
    document.cookie = `${COOKIE_NAME}=${value}; path=/${domain ? `; domain=${domain}` : ""}`;
  }
}

/** Remove the cookie from every domain variant it may have been written on. */
export function clearTranslateLang(): void {
  if (typeof document === "undefined") return;
  for (const domain of cookieDomains()) {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0${domain ? `; domain=${domain}` : ""}`;
  }
}
