import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "@fontsource/geist-sans/800.css";
import "@fontsource/geist-sans/900.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "@fontsource/geist-mono/600.css";
import "@fontsource/geist-mono/700.css";
import "@/styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router";
import { installDomTranslationShim } from "@/lib/dom-translation-shim";
import { TRANSLATE_SOURCE_LANG, getTranslateLang } from "@/lib/google-translate";

// The crash this patches (facebook/react#11538) only happens once Google's
// translator has mutated the DOM, which only happens in a session that has
// the googtrans cookie set. Gating on that is exact, not heuristic: the
// architecture guarantees the cookie cannot change without a full reload
// (LanguageSwitcher writes it and reloads; see src/lib/google-translate.ts),
// so a session that starts without the cookie stays without it for its
// entire lifetime, and never needs the patch. This also bounds the prototype
// patch itself to sessions that opted into translation, rather than
// installing it globally for every reader forever.
//
// Known, accepted trade: a reader who uses Chrome's own right-click
// "Translate to…" without ever touching our switcher (so no cookie) is not
// covered by this patch. That is the pre-branch status quo — this branch
// does not regress it, it just declines to extend protection to a path the
// site does not drive.
//
// Must run before React commits anything to the DOM.
if (getTranslateLang() !== TRANSLATE_SOURCE_LANG) {
  installDomTranslationShim();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
