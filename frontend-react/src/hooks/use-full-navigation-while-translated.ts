import { useEffect } from "react";
import { TRANSLATE_SOURCE_LANG, getTranslateLang } from "@/lib/google-translate";

/**
 * While a translation is active, make internal links do a full page load.
 *
 * Google's widget translates the document it finds at load time. React Router
 * swaps page content without a load, so a client-side navigation would render
 * the next article in Thai while the switcher still reads English. Forcing a
 * real navigation is slower but always correct, and it costs nothing on the
 * only surface Google gives us a stable contract for — the cookie.
 *
 * Readers on Thai, who are the majority, never get past the first check.
 */
export function useFullNavigationWhileTranslated(): void {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (getTranslateLang() === TRANSLATE_SOURCE_LANG) return;
      if (event.defaultPrevented || event.button !== 0) return;
      // Let the browser handle open-in-new-tab and friends.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      event.preventDefault();
      window.location.assign(url.href);
    }

    // Capture phase: React Router's Link handler runs in the bubble phase, so
    // this must see the click first to be able to pre-empt it.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);
}
