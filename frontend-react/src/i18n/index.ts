import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import th from "@/messages/th.json";

// The site is Thai-only — there is no language switcher, and readers who want
// another language use their browser's translation. i18next is kept as the one
// place UI strings live, so adding a language later means adding a resource
// file rather than rewiring components.
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
