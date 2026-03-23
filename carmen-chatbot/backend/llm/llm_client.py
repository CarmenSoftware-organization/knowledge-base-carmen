"""LLM infrastructure: creation, retry, query rewriting, error formatting, token utilities."""
import re
import asyncio
import logging

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from ..core.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """Low-level LLM operations: creation, invocation, retry, utilities."""

    def __init__(self):
        self.api_base = settings.active_api_base
        self.api_key = settings.active_api_key
        self.default_model = settings.active_chat_model

    # ------------------------------------------------------------------
    # Model selection
    # ------------------------------------------------------------------
    def get_active_model(self, override_model: str = None) -> str:
        return override_model or self.default_model

    # ------------------------------------------------------------------
    # LLM factory
    # ------------------------------------------------------------------
    def _create_llm(self, streaming: bool = False, model_name: str = None, max_tokens: int = None) -> ChatOpenAI:
        """Create a ChatOpenAI instance with provider-specific settings."""
        kwargs = dict(
            model=model_name or self.default_model,
            openai_api_key=self.api_key,
            openai_api_base=self.api_base,
            temperature=0.82,
            max_tokens=max_tokens or 8192,
            streaming=streaming,
            extra_body={
                "include_reasoning": False,
                "provider": {"allow_fallbacks": False, "require_parameters": True},
            },
        )
        if streaming:
            kwargs["stream_usage"] = True
        return ChatOpenAI(**kwargs)

    # ------------------------------------------------------------------
    # Security
    # ------------------------------------------------------------------
    def _sanitize_input(self, text: str) -> str:
        """Strip XML-like tags to prevent prompt injection tag breakout."""
        if not text:
            return ""
        return re.sub(
            r'</?(user_input|context|history|chat_history|manual|system_instruction)[^>]*>',
            '', text, flags=re.IGNORECASE
        )

    # ------------------------------------------------------------------
    # Error formatting
    # ------------------------------------------------------------------
    def _format_error(self, e: Exception, lang: str = "th") -> str:
        """Convert raw LLM exceptions into user-friendly messages."""
        error_str = str(e)

        if "405" in error_str or "security" in error_str.lower() or "blocked" in error_str.lower():
            return (
                "Security Policy: This request was blocked due to potentially unsafe content."
                if lang == "en" else
                "นโยบายความปลอดภัย: คำขอถูกระงับเนื่องจากตรวจพบบางอย่างที่ไม่เหมาะสม"
            )
        if "429" in error_str or "rate limit" in error_str.lower():
            return (
                "Too many requests. Please slow down and try again in a moment."
                if lang == "en" else
                "มีการเรียกใช้งานมากเกินไป กรุณาลองใหม่ในภายหลัง"
            )
        if any(code in error_str for code in ["500", "502", "503"]):
            return (
                "The AI service is currently unavailable. Please try again later."
                if lang == "en" else
                "บริการ AI ขัดข้องชั่วคราว กรุณาลองใหม่ในภายหลัง"
            )
        if "<!doctype" in error_str.lower() or "<html" in error_str.lower():
            match = re.search(r"Error code: (\d+)", error_str)
            code = match.group(1) if match else "Unknown"
            return (
                f"AI Service Error ({code}). Please try again."
                if lang == "en" else
                f"เกิดข้อผิดพลาดจากบริการ AI ({code}) กรุณาลองใหม่"
            )
        return error_str

    # ------------------------------------------------------------------
    # Token budget utilities
    # ------------------------------------------------------------------
    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimate: ~4 chars/token for ASCII, ~2 chars/token for Thai/CJK."""
        ascii_count = sum(1 for c in text if ord(c) < 128)
        non_ascii_count = len(text) - ascii_count
        return max(1, (ascii_count // 4) + (non_ascii_count // 2))

    def _trim_context(self, context_text: str, token_budget: int) -> str:
        """Trim context to fit within token_budget, preserving complete chunks."""
        if self._estimate_tokens(context_text) <= token_budget:
            return context_text
        chunks = context_text.split("\n\n")
        trimmed, used = [], 0
        for chunk in chunks:
            t = self._estimate_tokens(chunk)
            if used + t > token_budget:
                break
            trimmed.append(chunk)
            used += t
        result = "\n\n".join(trimmed) if trimmed else context_text[:token_budget * 3]
        logger.warning(
            f"⚠️ Context trimmed: ~{self._estimate_tokens(context_text)} → "
            f"~{self._estimate_tokens(result)} tokens (budget: {token_budget})"
        )
        return result

    # ------------------------------------------------------------------
    # Retry + fallback
    # ------------------------------------------------------------------
    async def _invoke_with_retry(self, messages, model_name: str):
        """Non-streaming LLM call with exponential backoff and optional fallback model."""
        RETRYABLE = ("429", "500", "502", "503")
        MAX_RETRIES = 2

        models_to_try = [model_name]
        if settings.OPENROUTER_FALLBACK_MODEL and settings.OPENROUTER_FALLBACK_MODEL != model_name:
            models_to_try.append(settings.OPENROUTER_FALLBACK_MODEL)

        last_error = None
        for current_model in models_to_try:
            llm = self._create_llm(streaming=False, model_name=current_model)
            for attempt in range(MAX_RETRIES + 1):
                try:
                    return await llm.ainvoke(messages)
                except Exception as e:
                    last_error = e
                    if any(c in str(e) for c in RETRYABLE) and attempt < MAX_RETRIES:
                        wait = 2 ** attempt
                        logger.warning(f"⚠️ [{current_model}] attempt {attempt + 1}, retry in {wait}s: {e}")
                        await asyncio.sleep(wait)
                    else:
                        logger.warning(f"⚠️ [{current_model}] failed: {e}")
                        break
        raise last_error

    # ------------------------------------------------------------------
    # Query rewriting
    # ------------------------------------------------------------------
    async def _rewrite_query(self, message: str, history_text: str) -> tuple[str, int, int]:
        """Rewrite a follow-up question into a standalone query.

        Returns (rewritten_query, input_tokens, output_tokens).
        """
        try:
            from .prompt import REWRITE_PROMPT
            llm = self._create_llm(streaming=False, model_name=settings.active_intent_model, max_tokens=500)
            system_part = REWRITE_PROMPT.split("Conversation:")[0].strip()
            sanitized = self._sanitize_input(message)
            human_part = (
                f"Conversation:\n<history>{history_text}</history>\n\n"
                f"Latest message: <user_input>{sanitized}</user_input>\n\nStandalone Query:"
            )
            messages = [SystemMessage(content=system_part), HumanMessage(content=human_part)]
            response = await llm.ainvoke(messages)

            input_tokens = output_tokens = 0
            resp_meta = getattr(response, 'response_metadata', {})
            if resp_meta and 'token_usage' in resp_meta:
                tu = resp_meta['token_usage']
                input_tokens = tu.get('prompt_tokens', 0)
                output_tokens = tu.get('completion_tokens', 0)
            else:
                usage = getattr(response, 'usage_metadata', None)
                if usage and isinstance(usage, dict):
                    input_tokens = usage.get('input_tokens', 0)
                    output_tokens = usage.get('output_tokens', 0)

            rewritten = response.content.strip().strip('"').strip("'")
            if len(rewritten) < 3 or len(rewritten) > 200:
                return message, input_tokens, output_tokens
            return rewritten, input_tokens, output_tokens
        except Exception as e:
            logger.warning(f"⚠️ Query rewrite failed: {e}")
            return message, 0, 0
