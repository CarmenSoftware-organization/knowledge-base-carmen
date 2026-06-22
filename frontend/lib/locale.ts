const LOCALE_COOKIE = "NEXT_LOCALE";

export function setLocaleCookie(locale: string) {
  if (typeof window === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event("locale-changed"));
}

export function getLocaleFromClient(): string {
  if (typeof window === "undefined") return "th";
  const match = document.cookie.match(new RegExp(`(^| )${LOCALE_COOKIE}=([^;]+)`));
  if (match) {
    try {
      return decodeURIComponent(match[2]);
    } catch {
      return match[2];
    }
  }
  return "th";
}
