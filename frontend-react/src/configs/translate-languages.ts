export type TranslateLanguage = {
  /** Google Translate language code, used as the cookie's target segment. */
  code: string;
  /** The language's own name — someone hunting for their language can always
   *  read it written in that language, but may not read English. */
  label: string;
};

/**
 * The 24 languages offered in the header. Google supports well over a hundred,
 * but a hundred-row dropdown is a dropdown nobody can search. Ordered by who
 * actually reads this KB: Thai and English first, then ASEAN and East Asia,
 * then the rest.
 *
 * `th` is first so the control can show the current state and offer the way
 * back; selecting it clears the cookie rather than writing `/th/th`.
 */
export const TRANSLATE_LANGUAGES: TranslateLanguage[] = [
  { code: "th", label: "ไทย" },
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "km", label: "ភាសាខ្មែរ" },
  { code: "lo", label: "ລາວ" },
  { code: "my", label: "မြန်မာ" },
  { code: "hi", label: "हिन्दी" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "he", label: "עברית" },
  { code: "tr", label: "Türkçe" },
  { code: "fil", label: "Filipino" },
];
