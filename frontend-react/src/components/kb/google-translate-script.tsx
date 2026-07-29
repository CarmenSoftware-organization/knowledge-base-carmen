"use client";

import { useEffect } from "react";
import {
  TRANSLATE_SOURCE_LANG,
  clearTranslateLang,
  getTranslateLang,
} from "@/lib/google-translate";

const SCRIPT_ID = "google-translate-script";
const MOUNT_ID = "google_translate_element";
const SCRIPT_SRC =
  "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

/** How long to wait for Google before deciding the script is not coming. */
const LOAD_GRACE_MS = 8000;

type TranslateElementOptions = { pageLanguage: string; autoDisplay: boolean };

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (
          options: TranslateElementOptions,
          containerId: string,
        ) => unknown;
      };
    };
  }
}

/**
 * Loads Google's Website Translator with its own UI suppressed: no dropdown
 * (we render our own), no banner (see globals.css). The widget still needs a
 * mount node, so this renders a hidden one.
 *
 * `autoDisplay: false` stops Google from offering its own language prompt —
 * switching is explicit, through our header control.
 */
export function GoogleTranslateScript() {
  useEffect(() => {
    // If Google never arrives, drop any active cookie so the switcher reports
    // Thai — which is what the reader is actually looking at. Blocked by a
    // corporate firewall, offline, or Google retiring a widget it stopped
    // supporting in 2019: all the same outcome, and all expected.
    const giveUp = () => {
      if (window.google?.translate) return;
      if (getTranslateLang() !== TRANSLATE_SOURCE_LANG) clearTranslateLang();
    };

    // Armed on every mount, independent of the script-injection guard below.
    // In StrictMode dev, effect #1 mounts, appends the script, and arms this
    // timer; React then runs cleanup (clearing that timer) and remounts for
    // real. If arming were inside the `getElementById` guard, the second,
    // live mount would find the tag already present, skip the block
    // entirely, and leave this page with no timeout for the rest of its
    // life — only `script.onerror` would remain as a fail-safe. Arming here
    // keeps the invariant: every mount has a live timer, and at most one
    // script tag is ever appended.
    const timer = setTimeout(giveUp, LOAD_GRACE_MS);

    if (!document.getElementById(SCRIPT_ID)) {
      window.googleTranslateElementInit = () => {
        const TranslateElement = window.google?.translate?.TranslateElement;
        if (!TranslateElement) return;
        new TranslateElement(
          { pageLanguage: TRANSLATE_SOURCE_LANG, autoDisplay: false },
          MOUNT_ID,
        );
      };

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onerror = giveUp;
      document.body.appendChild(script);
    }

    return () => clearTimeout(timer);
  }, []);

  return <div id={MOUNT_ID} className="hidden" aria-hidden />;
}
