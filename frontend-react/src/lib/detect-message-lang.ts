export type MessageLang = "th" | "en";

/** Any character in the Thai Unicode block (U+0E00–U+0E7F). */
const THAI_CHAR = /[\u0E00-\u0E7F]/;

/** Any basic Latin letter — used only to tell "English" apart from "no letters at all". */
const LATIN_LETTER = /[A-Za-z]/;

/**
 * Detect the language of a chat message.
 *
 * Pure — no I/O, no state, no user preference. The site has no language
 * switcher; this exists only so the chat backend can pick the language of its
 * status strings ("กำลังค้นหา…") and its "no information found" message. The
 * substantive answer is steered by the LLM prompt, which already matches the
 * language of the incoming message, so a wrong result here is cheap.
 *
 * Presence rule: one Thai character is enough. This KB is Thai-first, so
 * "how to fix ใบกำกับภาษี" counts as Thai. Text with no letters at all (empty,
 * whitespace, digits, emoji) also defaults to Thai, since this KB is Thai-first.
 */
export function detectMessageLang(text: string): MessageLang {
  if (THAI_CHAR.test(text)) return "th";
  return LATIN_LETTER.test(text) ? "en" : "th";
}
