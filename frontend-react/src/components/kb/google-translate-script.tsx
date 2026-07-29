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
    if (document.getElementById(SCRIPT_ID)) return;

    window.googleTranslateElementInit = () => {
      const TranslateElement = window.google?.translate?.TranslateElement;
      if (!TranslateElement) return;
      new TranslateElement(
        { pageLanguage: TRANSLATE_SOURCE_LANG, autoDisplay: false },
        MOUNT_ID,
      );
    };

    // If Google never arrives, drop any active cookie so the switcher reports
    // Thai — which is what the reader is actually looking at. Blocked by a
    // corporate firewall, offline, or Google retiring a widget it stopped
    // supporting in 2019: all the same outcome, and all expected.
    const giveUp = () => {
      if (window.google?.translate) return;
      if (getTranslateLang() !== TRANSLATE_SOURCE_LANG) clearTranslateLang();
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onerror = giveUp;
    document.body.appendChild(script);

    const timer = setTimeout(giveUp, LOAD_GRACE_MS);
    return () => clearTimeout(timer);
  }, []);

  return <div id={MOUNT_ID} className="hidden" aria-hidden />;
}
