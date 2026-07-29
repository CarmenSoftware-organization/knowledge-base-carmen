export type MessageLang = "th" | "en";

/** Any character in the Thai Unicode block (U+0E00–U+0E7F). */
const THAI_CHAR = /[\u0E00-\u0E7F]/;

/** Any basic Latin letter — used only to tell "English" apart from "no letters at all". */
const LATIN_LETTER = /[A-Za-z]/;

/**
 * Detect the language of a chat message.
 *
 * Pure — no I/O, no state, no user preference. The site has no language
 * switcher; this exists only so the chat backend can pick the language of a
 * handful of `chunk` events — intent classification, the "no information
 * found" apology, the prompt language, and empty/truncation notices. The
 * substantive answer is steered by the LLM prompt, which already matches the
 * language of the incoming message, so a wrong result here is cheap.
 *
 * Presence rule: one Thai character is enough. This KB is Thai-first, so
 * "how to fix ใบกำกับภาษี" counts as Thai. Text with no Thai and no Latin
 * letters (empty, whitespace, digits, emoji, or another script entirely —
 * Chinese, Japanese, Cyrillic, Arabic) also defaults to Thai.
 */
export function detectMessageLang(text: string): MessageLang {
  if (THAI_CHAR.test(text)) return "th";
  return LATIN_LETTER.test(text) ? "en" : "th";
}
