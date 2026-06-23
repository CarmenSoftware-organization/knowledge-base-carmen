import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/messages/en.json";
import th from "@/messages/th.json";
import { getLocaleFromClient } from "@/lib/locale";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, th: { translation: th } },
    lng: getLocaleFromClient(),
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

// Keep i18next in sync when the locale cookie changes.
if (typeof window !== "undefined") {
  window.addEventListener("locale-changed", () => {
    const next = getLocaleFromClient();
    if (next !== i18n.language) void i18n.changeLanguage(next);
    document.documentElement.lang = next;
  });
}

export default i18n;
