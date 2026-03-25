"""Locale strings and prompt construction helpers.

Pure functions — no LLM calls, no I/O. Safe to import anywhere.
"""
from langchain_core.messages import SystemMessage, HumanMessage

# ---------------------------------------------------------------------------
# Locale configuration
# ---------------------------------------------------------------------------
LOCALES: dict[str, dict[str, str]] = {
    "th": {
        "status_analyzing": "กำลังวิเคราะห์คำถาม...",
        "status_searching": "กำลังค้นหาและคัดกรองข้อมูล...",
        "status_composing": "กำลังเรียบเรียงคำตอบ...",
        "preface": "จากข้อมูลในคู่มือ",
        "instruction": (
            "Always respond in Thai language using natural, conversational Thai — "
            "as if you're a helpful colleague talking to someone, not reading from a manual. "
            "Use polite particles (ค่ะ/ครับ/นะคะ) naturally where they fit, not mechanically at the end of every sentence. "
            "Vary your sentence structure and word choices. "
            "This includes the [SUGGESTIONS] section — all 3 suggested questions MUST be written in Thai only. "
            "Never use Chinese or any other language."
        ),
    },
    "en": {
        "status_analyzing": "Analyzing your question...",
        "status_searching": "Searching and filtering data...",
        "status_composing": "Composing response...",
        "preface": "Based on the manual",
        "instruction": (
            "Always respond in English using natural, conversational language — "
            "warm and helpful, like a knowledgeable colleague, not a formal document. "
            "Vary your sentence structure and avoid stiff phrasing. "
            "If the provided manual (คู่มือ) is in Thai, translate the relevant information into natural, flowing English. "
            "Do NOT quote Thai text directly. "
            "This includes the [SUGGESTIONS] section — all 3 suggested questions MUST be written in English only."
        ),
    },
}

LANG_NAMES = {"th": "Thai", "en": "English"}

TRUNCATION_NOTICE = {
    "th": "\n\n_(คำตอบนี้ยาวเกินกว่าที่ระบบจะแสดงได้ในครั้งเดียว หากต้องการข้อมูลเพิ่มเติม ลองถามแยกเป็นหัวข้อย่อย ๆ ได้เลยครับ)_",
    "en": "\n\n_(The response was too long to complete in one reply. Try asking about a specific part of the topic instead.)_",
}

EMPTY_RESPONSE_NOTICE = {
    "th": "_(AI ไม่สามารถสร้างคำตอบได้ ขีดจำกัด token อาจน้อยเกินไปสำหรับคำถามนี้)_",
    "en": "_(The AI could not generate a response. The token limit may be too small for this question.)_",
}


def get_locale(lang: str) -> dict[str, str]:
    """Return locale strings for the given language code, defaulting to Thai."""
    return LOCALES.get(lang or "th", LOCALES["th"])


def build_messages(
    system_base: str,
    l: dict[str, str],
    lang: str,
    context_text: str,
    history_text: str,
    sanitized_message: str,
) -> tuple[list, str]:
    """Build LangChain message list for a chat request.

    Returns (messages, full_system_content) — the second value is useful for
    token estimation.
    """
    system_content = system_base.replace("the designated preface phrase", f"'{l['preface']}'")
    target_lang = LANG_NAMES.get(lang, "Thai")
    system_content = system_content.replace("the requested language", target_lang)
    full_system = system_content + f"\n\nIMPORTANT: {l['instruction']}"

    messages = [
        SystemMessage(content=full_system),
        HumanMessage(
            content=(
                f"คู่มือ:\n<context>{context_text}</context>\n\n"
                f"Chat History:\n<chat_history>{history_text}</chat_history>\n\n"
                f"Question: <user_input>{sanitized_message}</user_input>\n\nAnswer:"
            )
        ),
    ]
    return messages, full_system
