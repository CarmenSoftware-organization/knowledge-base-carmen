import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import th from "@/messages/th.json";

// UI strings are authored in Thai and live in th.json — i18next only ever
// loads this one resource. A reader who wants another language picks it from
// the header's language switcher, which translates the rendered page
// client-side through Google's Website Translator (see
// src/lib/google-translate.ts); it does not add i18next resources or change
// what this module loads.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { th: { translation: th } },
    lng: "th",
    fallbackLng: "th",
    interpolation: {
      prefix: "{",
      suffix: "}",
      escapeValue: false,
    },
    keySeparator: ".",
    nsSeparator: false,
    returnNull: false,
  });
}

export default i18n;
