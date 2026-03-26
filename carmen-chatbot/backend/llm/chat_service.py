"""Main chat orchestration service (streaming + non-streaming).

Architecture:
  LLMClient  (llm_client.py)   — low-level: create LLM, retry, rewrite, token utils
  prompt_builder (prompt_builder.py) — pure: LOCALES, build_messages
  LLMService (this file)       — orchestration: intent → retrieval → LLM → log
"""
import json
import re
import time
import asyncio
import logging
from datetime import datetime

from fastapi import Request

from ..core.config import settings
from .retrieval import retrieval_service
from .prompt import BASE_PROMPT
from . import chat_history
from .intent_router import intent_router
from ..core.logging_config import log_query, log_intent, log_search, log_performance
from .llm_client import LLMClient
from .prompt_builder import get_locale, build_messages, TRUNCATION_NOTICE, EMPTY_RESPONSE_NOTICE

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level helpers (pure, no class state)
# ---------------------------------------------------------------------------

def _parse_device_type(user_agent: str) -> str:
    """Classify User-Agent string into mobile / tablet / desktop / unknown."""
    if not user_agent:
        return "unknown"
    ua = user_agent.lower()
    if "tablet" in ua or "ipad" in ua:
        return "tablet"
    if any(x in ua for x in ("mobile", "android", "iphone", "ipod", "windows phone")):
        return "mobile"
    if any(x in ua for x in ("mozilla", "chrome", "safari", "gecko", "windows", "macintosh", "linux")):
        return "desktop"
    return "unknown"


def _extract_token_usage(response) -> tuple[int, int]:
    """Extract (input_tokens, output_tokens) from any LangChain response/chunk."""
    if not response:
        return 0, 0
    usage = getattr(response, 'usage_metadata', None)
    if usage and isinstance(usage, dict):
        return usage.get('input_tokens', 0), usage.get('output_tokens', 0)
    resp_meta = getattr(response, 'response_metadata', {})
    if resp_meta and 'token_usage' in resp_meta:
        tu = resp_meta['token_usage']
        return tu.get('prompt_tokens', 0), tu.get('completion_tokens', 0)
    return 0, 0


def _build_log_payload(
    *,
    room_id: str, bu: str, username: str,
    message: str, response: str,
    model_name: str,
    chat_input_tokens: int, chat_output_tokens: int,
    intent_tokens: tuple[int, int],
    embed_tokens: int,
    rewrite_in: int, rewrite_out: int,
    source_debug: list,
    start_time: float,
    lang: str, intent_type: str,
    was_rewritten: bool, had_zero_results: bool,
    was_truncated: bool, retrieved_chunks: int,
    history_count: int, ttft_ms: int = 0,
    avg_similarity_score: float | None = None,
    device_type: str = "unknown",
    referrer_page: str | None = None,
) -> dict:
    """Build the standard chat log payload dict, shared by all code paths."""
    return {
        "room_id": room_id, "bu": bu, "username": username,
        "user_query": message, "bot_response": response,
        "model_name": model_name,
        "chat_input_tokens": chat_input_tokens,
        "chat_output_tokens": chat_output_tokens,
        "intent_input_tokens": intent_tokens[0],
        "intent_output_tokens": intent_tokens[1],
        "embed_tokens": embed_tokens,
        "rewrite_input_tokens": rewrite_in,
        "rewrite_output_tokens": rewrite_out,
        "embed_model": settings.LLM_EMBED_MODEL,
        "intent_model": settings.active_intent_model,
        "sources": source_debug,
        "timestamp": datetime.now(),
        "duration": time.time() - start_time,
        "lang": lang,
        "intent_type": intent_type,
        "was_rewritten": was_rewritten,
        "had_zero_results": had_zero_results,
        "was_truncated": was_truncated,
        "retrieved_chunks": retrieved_chunks,
        "history_length": history_count,
        "ttft_ms": ttft_ms,
        "avg_similarity_score": avg_similarity_score,
        "answer_length": len(response),
        "device_type": device_type,
        "referrer_page": referrer_page,
    }


# ---------------------------------------------------------------------------
# Main service
# ---------------------------------------------------------------------------

class LLMService(LLMClient):
    def __init__(self):
        super().__init__()
        print(f"💬 AI Chat Model Initialization Complete using {self.default_model}")

    # ------------------------------------------------------------------
    # Streaming chat
    # ------------------------------------------------------------------
    async def stream_chat(
        self, message: str, bu: str, room_id: str, username: str,
        model_name: str = None, history: list[dict] = None,
        db_schema: str = "carmen", lang: str = "th", request: Request = None,
        referrer_page: str = None,
    ):
        start_time = time.time()
        model_name = self.get_active_model(model_name)
        l = get_locale(lang)
        ttft = 0.0
        device_type = _parse_device_type(
            request.headers.get("user-agent", "") if request else ""
        )

        history_count = len(history) if history else 0
        log_query(message, history_count)
        total_tokens_map = {"intent": (0, 0), "rewrite": (0, 0), "chat_input": 0, "chat_output": 0}

        # ── STEP 0: Intent Detection ──────────────────────────────────
        have_history = chat_history.has_history(room_id)
        intent_type, quick_reply, intent_tokens, intent_embed_tokens = await intent_router.detect_intent(
            message, lang, have_history=have_history
        )
        log_intent(intent_type, settings.active_intent_model, intent_tokens)
        total_tokens_map["intent"] = intent_tokens

        if intent_type in ["greeting", "thanks", "out_of_scope", "company_info", "capabilities"]:
            duration = time.time() - start_time
            yield json.dumps({"type": "chunk", "data": quick_reply}) + "\n"
            log_id = await chat_history.save_chat_logs(_build_log_payload(
                room_id=room_id, bu=bu, username=username, message=message, response=quick_reply,
                model_name=settings.active_intent_model,
                chat_input_tokens=intent_tokens[0], chat_output_tokens=intent_tokens[1],
                intent_tokens=intent_tokens, embed_tokens=intent_embed_tokens,
                rewrite_in=0, rewrite_out=0, source_debug=[], start_time=start_time,
                lang=lang, intent_type=intent_type, was_rewritten=False,
                had_zero_results=False, was_truncated=False,
                retrieved_chunks=0, history_count=history_count,
                device_type=device_type, referrer_page=referrer_page,
            ))
            yield json.dumps({"type": "done", "id": log_id}) + "\n"
            log_performance(total_tokens_map, duration, duration)
            return

        if history:
            chat_history.restore_history(room_id, history)
        history_text = chat_history.get_history_text(room_id)
        logger.info(f"⚡ Processing as TECH_SUPPORT: '{message}'")

        # ── STEP 1: Query Rewriting ────────────────────────────────────
        search_query, was_rewritten, rewrite_in, rewrite_out = message, False, 0, 0
        if chat_history.has_history(room_id):
            if request and await request.is_disconnected():
                logger.warning("🛑 Client disconnected before rewrite.")
                return
            yield json.dumps({"type": "status", "data": l["status_analyzing"]}) + "\n"
            await asyncio.sleep(0)
            t0 = time.time()
            search_query, rewrite_in, rewrite_out = await self._rewrite_query(message, history_text)
            was_rewritten = search_query != message
            total_tokens_map["rewrite"] = (rewrite_in, rewrite_out)
            logger.info(f"⏱️ Rewrite Time: {time.time() - t0:.2f}s  |  \"{message}\" → \"{search_query}\"")

        # ── STEP 2: Retrieval ──────────────────────────────────────────
        if request and await request.is_disconnected():
            logger.warning("🛑 Client disconnected before retrieval.")
            return
        yield json.dumps({"type": "status", "data": l["status_searching"]}) + "\n"
        await asyncio.sleep(0)
        passed_docs, source_debug, retrieval_embed_tokens, avg_similarity_score = await retrieval_service.search(search_query, db_schema)
        log_search(search_query, passed_docs)

        retrieved_chunks = len(passed_docs)
        embed_tokens = intent_embed_tokens + retrieval_embed_tokens

        if not passed_docs:
            duration = time.time() - start_time
            reply = intent_router.canned_responses["out_of_scope"].get(lang, intent_router.canned_responses["out_of_scope"]["th"])
            yield json.dumps({"type": "chunk", "data": reply}) + "\n"
            log_id = await chat_history.save_chat_logs(_build_log_payload(
                room_id=room_id, bu=bu, username=username, message=message, response=reply,
                model_name="zero_result_safeguard", chat_input_tokens=0, chat_output_tokens=0,
                intent_tokens=intent_tokens, embed_tokens=embed_tokens,
                rewrite_in=rewrite_in, rewrite_out=rewrite_out, source_debug=[], start_time=start_time,
                lang=lang, intent_type="tech_support", was_rewritten=was_rewritten,
                had_zero_results=True, was_truncated=False,
                retrieved_chunks=0, history_count=history_count,
                device_type=device_type, referrer_page=referrer_page,
            ))
            yield json.dumps({"type": "done", "id": log_id}) + "\n"
            log_performance(total_tokens_map, 0, duration)
            return

        context_text = "\n\n".join([d.page_content for d in passed_docs])
        yield json.dumps({"type": "sources", "data": source_debug}) + "\n"
        if request and await request.is_disconnected():
            logger.warning("🛑 Client disconnected before composing answer.")
            return
        yield json.dumps({"type": "status", "data": l["status_composing"]}) + "\n"
        await asyncio.sleep(0)

        # ── STEP 3: LLM Streaming ──────────────────────────────────────
        full_response = ""
        last_chunk = None
        was_truncated = False
        try:
            system_base = BASE_PROMPT.split("data_input:")[0].strip()
            context_budget = (
                settings.MAX_PROMPT_TOKENS
                - self._estimate_tokens(system_base)
                - self._estimate_tokens(history_text)
                - self._estimate_tokens(message)
                - 300
            )
            if context_budget > 0:
                context_text = self._trim_context(context_text, context_budget)

            messages, _ = build_messages(system_base, l, lang, context_text, history_text, self._sanitize_input(message))

            models_to_try = [model_name]
            if settings.LLM_FALLBACK_MODEL and settings.LLM_FALLBACK_MODEL != model_name:
                models_to_try.append(settings.LLM_FALLBACK_MODEL)

            accumulated = None
            first_token_time = None
            yielded_text_len = 0
            tag = "[SUGGESTIONS]"
            stream_finish_reason = None
            content_yielded = False

            for current_model in models_to_try:
                accumulated = first_token_time = None
                yielded_text_len = 0
                stream_finish_reason = None
                full_response = ""
                content_yielded = False

                try:
                    llm = self._create_llm(streaming=True, model_name=current_model)
                    async with asyncio.timeout(90):
                      async for chunk in llm.astream(messages):
                        if request and await request.is_disconnected():
                            logger.warning("🛑 Client disconnected during streaming.")
                            partial_duration = time.time() - start_time
                            partial_input, partial_output = _extract_token_usage(accumulated)
                            if partial_input == 0 and partial_output == 0:
                                partial_input = len((context_text + message).encode('utf-8')) // 3
                                partial_output = len(full_response.encode('utf-8')) // 3
                            total_tokens_map["chat_input"] = partial_input
                            total_tokens_map["chat_output"] = partial_output
                            log_performance(total_tokens_map, ttft, partial_duration)
                            await chat_history.save_chat_logs(_build_log_payload(
                                room_id=room_id, bu=bu, username=username, message=message, response=full_response,
                                model_name=current_model,
                                chat_input_tokens=partial_input, chat_output_tokens=partial_output,
                                intent_tokens=intent_tokens, embed_tokens=embed_tokens,
                                rewrite_in=rewrite_in, rewrite_out=rewrite_out, source_debug=source_debug,
                                start_time=start_time, lang=lang, intent_type="tech_support",
                                was_rewritten=was_rewritten, had_zero_results=False, was_truncated=False,
                                retrieved_chunks=retrieved_chunks, history_count=history_count,
                                ttft_ms=round(ttft * 1000),
                                avg_similarity_score=avg_similarity_score,
                                device_type=device_type, referrer_page=referrer_page,
                            ))
                            return

                        if first_token_time is None and chunk.content:
                            first_token_time = time.time()
                            ttft = first_token_time - start_time
                            print(f"⏱️ TTFT: {ttft:.2f}s")

                        chunk_meta = getattr(chunk, 'response_metadata', {})
                        if chunk_finish := chunk_meta.get('finish_reason') or chunk_meta.get('stop_reason'):
                            stream_finish_reason = chunk_finish

                        accumulated = chunk if accumulated is None else accumulated + chunk
                        if chunk.content:
                            content_yielded = True
                            full_response += chunk.content

                            if tag in full_response:
                                tag_index = full_response.find(tag)
                                if yielded_text_len < tag_index:
                                    to_yield = full_response[yielded_text_len:tag_index]
                                    yield json.dumps({"type": "chunk", "data": to_yield}) + "\n"
                                    yielded_text_len = tag_index
                            else:
                                # Hold back partial tag suffix
                                potential_limit = len(full_response)
                                for i in range(len(tag), 0, -1):
                                    if full_response.endswith(tag[:i]):
                                        potential_limit = len(full_response) - i
                                        break
                                to_yield = full_response[yielded_text_len:potential_limit]
                                if to_yield:
                                    yield json.dumps({"type": "chunk", "data": to_yield}) + "\n"
                                    yielded_text_len += len(to_yield)

                except Exception as model_err:
                    if content_yielded:
                        raise
                    logger.warning(f"⚠️ Model {current_model} failed before yielding content: {model_err}")
                    if current_model == models_to_try[-1]:
                        raise
                    continue
                break  # streaming completed successfully

            # Yield any remaining text (when tag was never found)
            if tag not in full_response and yielded_text_len < len(full_response):
                remaining = full_response[yielded_text_len:]
                yield json.dumps({"type": "chunk", "data": remaining}) + "\n"

            last_chunk = accumulated

            # ── Extract suggestions ────────────────────────────────────
            suggestions: list = []
            suggestion_match = re.search(r'\[SUGGESTIONS\]\s*(\{.*\}|\[.*\])', full_response, re.DOTALL)
            if suggestion_match:
                tag_start = full_response.find(tag)
                full_response = full_response[:tag_start].strip()
                try:
                    suggestions = json.loads(suggestion_match.group(1).replace("```json", "").replace("```", "").strip())
                except Exception as e:
                    logger.warning(f"⚠️ Failed to parse suggestions (regex): {e}")
            elif tag in full_response:
                parts = full_response.split(tag)
                full_response = parts[0].strip()
                try:
                    suggestions = json.loads(parts[1].replace("```json", "").replace("```", "").strip())
                except Exception as e:
                    logger.warning(f"⚠️ Failed to parse suggestions (split): {e}")

            if suggestions:
                yield json.dumps({"type": "suggestions", "data": suggestions}) + "\n"

            # ── Truncation / empty response notice ─────────────────────
            if stream_finish_reason in ("length", "max_tokens"):
                was_truncated = True
                notice = TRUNCATION_NOTICE.get(lang, TRUNCATION_NOTICE["th"])
                full_response += notice
                yield json.dumps({"type": "chunk", "data": notice}) + "\n"
                logger.warning(f"⚠️ LLM response truncated (finish_reason={stream_finish_reason})")
            elif not full_response.strip():
                # LLM produced no answer text (e.g. output [SUGGESTIONS] first without any answer).
                # Fall back to out_of_scope canned response so the user gets a meaningful reply.
                notice = intent_router.canned_responses["out_of_scope"].get(
                    lang, intent_router.canned_responses["out_of_scope"]["th"]
                )
                full_response = notice
                yield json.dumps({"type": "chunk", "data": notice}) + "\n"
                logger.warning("⚠️ LLM returned empty response (possible [SUGGESTIONS]-first output)")

        except Exception as e:
            error_msg = self._format_error(e, lang)
            logger.error(f"❌ LLM Error: {e}")
            fallback = (
                f"Error processing request: {error_msg}" if lang == "en"
                else f"ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล: {error_msg}"
            )
            yield json.dumps({"type": "chunk", "data": fallback}) + "\n"
            yield json.dumps({"type": "done", "id": 0}) + "\n"
            return

        # ── Token accounting + log ─────────────────────────────────────
        duration = time.time() - start_time
        input_tokens, output_tokens = _extract_token_usage(last_chunk)
        if input_tokens == 0 and output_tokens == 0:
            input_tokens = len((context_text + message).encode('utf-8')) // 3
            output_tokens = len(full_response.encode('utf-8')) // 3

        total_tokens_map["chat_input"] = input_tokens
        total_tokens_map["chat_output"] = output_tokens
        log_performance(total_tokens_map, ttft, duration)

        log_id = await chat_history.save_chat_logs(_build_log_payload(
            room_id=room_id, bu=bu, username=username, message=message, response=full_response,
            model_name=model_name, chat_input_tokens=input_tokens, chat_output_tokens=output_tokens,
            intent_tokens=intent_tokens, embed_tokens=embed_tokens,
            rewrite_in=rewrite_in, rewrite_out=rewrite_out, source_debug=source_debug,
            start_time=start_time, lang=lang, intent_type="tech_support",
            was_rewritten=was_rewritten, had_zero_results=False, was_truncated=was_truncated,
            retrieved_chunks=retrieved_chunks, history_count=history_count,
            ttft_ms=round(ttft * 1000),
            avg_similarity_score=avg_similarity_score,
            device_type=device_type, referrer_page=referrer_page,
        ))
        yield json.dumps({"type": "done", "id": log_id}) + "\n"

    # ------------------------------------------------------------------
    # Non-streaming chat
    # ------------------------------------------------------------------
    async def invoke_chat(
        self, message: str, bu: str, room_id: str, username: str,
        model_name: str = None, history: list[dict] = None,
        db_schema: str = "carmen", lang: str = "th",
        request: Request = None, referrer_page: str = None,
    ) -> dict:
        start_time = time.time()
        model_name = self.get_active_model(model_name)
        l = get_locale(lang)
        device_type = _parse_device_type(
            request.headers.get("user-agent", "") if request else ""
        )
        history_count = len(history) if history else 0
        log_query(message, history_count)
        total_tokens_map = {"intent": (0, 0), "rewrite": (0, 0), "chat_input": 0, "chat_output": 0}

        # ── Intent Detection ───────────────────────────────────────────
        have_history = chat_history.has_history(room_id)
        intent_type, quick_reply, intent_tokens, intent_embed_tokens = await intent_router.detect_intent(
            message, lang, have_history=have_history
        )
        log_intent(intent_type, settings.active_intent_model, intent_tokens)
        total_tokens_map["intent"] = intent_tokens

        if intent_type in ["greeting", "thanks", "out_of_scope", "company_info", "capabilities"]:
            log_id = await chat_history.save_chat_logs(_build_log_payload(
                room_id=room_id, bu=bu, username=username, message=message, response=quick_reply,
                model_name=settings.active_intent_model,
                chat_input_tokens=intent_tokens[0], chat_output_tokens=intent_tokens[1],
                intent_tokens=intent_tokens, embed_tokens=intent_embed_tokens,
                rewrite_in=0, rewrite_out=0, source_debug=[], start_time=start_time,
                lang=lang, intent_type=intent_type, was_rewritten=False,
                had_zero_results=False, was_truncated=False,
                retrieved_chunks=0, history_count=history_count,
                device_type=device_type, referrer_page=referrer_page,
            ))
            log_performance(total_tokens_map, 0, time.time() - start_time)
            return {"reply": quick_reply, "sources": [], "room_id": room_id, "message_id": log_id}

        if history:
            chat_history.restore_history(room_id, history)
        history_text = chat_history.get_history_text(room_id)
        logger.info(f"⚡ Processing as TECH_SUPPORT: '{message}'")

        # ── Query Rewriting ────────────────────────────────────────────
        search_query, was_rewritten, rewrite_in, rewrite_out = message, False, 0, 0
        if chat_history.has_history(room_id):
            search_query, rewrite_in, rewrite_out = await self._rewrite_query(message, history_text)
            was_rewritten = search_query != message
            total_tokens_map["rewrite"] = (rewrite_in, rewrite_out)

        # ── Retrieval ──────────────────────────────────────────────────
        passed_docs, source_debug, retrieval_embed_tokens, avg_similarity_score = await retrieval_service.search(search_query, db_schema)
        log_search(search_query, passed_docs)
        retrieved_chunks = len(passed_docs)
        embed_tokens = intent_embed_tokens + retrieval_embed_tokens

        if not passed_docs:
            reply = intent_router.canned_responses["out_of_scope"].get(
                lang, intent_router.canned_responses["out_of_scope"]["th"]
            )
            log_id = await chat_history.save_chat_logs(_build_log_payload(
                room_id=room_id, bu=bu, username=username, message=message, response=reply,
                model_name="zero_result_safeguard", chat_input_tokens=0, chat_output_tokens=0,
                intent_tokens=intent_tokens, embed_tokens=embed_tokens,
                rewrite_in=rewrite_in, rewrite_out=rewrite_out, source_debug=[], start_time=start_time,
                lang=lang, intent_type="tech_support", was_rewritten=was_rewritten,
                had_zero_results=True, was_truncated=False,
                retrieved_chunks=0, history_count=history_count,
                device_type=device_type, referrer_page=referrer_page,
            ))
            log_performance(total_tokens_map, 0, time.time() - start_time)
            return {"reply": reply, "sources": [], "room_id": room_id, "message_id": log_id}

        context_text = "\n\n".join([d.page_content for d in passed_docs])

        # ── LLM Invocation ─────────────────────────────────────────────
        input_tokens = output_tokens = 0
        was_truncated = False
        bot_ans = ""
        try:
            system_base = BASE_PROMPT.split("data_input:")[0].strip()
            context_budget = (
                settings.MAX_PROMPT_TOKENS
                - self._estimate_tokens(system_base)
                - self._estimate_tokens(history_text)
                - self._estimate_tokens(message)
                - 300
            )
            if context_budget > 0:
                context_text = self._trim_context(context_text, context_budget)

            messages, _ = build_messages(system_base, l, lang, context_text, history_text, self._sanitize_input(message))
            response = await self._invoke_with_retry(messages, model_name)
            bot_ans = response.content

            resp_meta = getattr(response, 'response_metadata', {})
            finish_reason = resp_meta.get('finish_reason') or resp_meta.get('stop_reason')
            if finish_reason in ("length", "max_tokens"):
                was_truncated = True
                bot_ans += TRUNCATION_NOTICE.get(lang, TRUNCATION_NOTICE["th"])
                logger.warning(f"⚠️ LLM response truncated (finish_reason={finish_reason})")
            elif not bot_ans.strip():
                bot_ans = EMPTY_RESPONSE_NOTICE.get(lang, EMPTY_RESPONSE_NOTICE["th"])
                logger.warning("⚠️ LLM returned empty response")

            input_tokens, output_tokens = _extract_token_usage(response)

        except Exception as e:
            error_msg = self._format_error(e, lang)
            logger.error(f"❌ LLM Error: {e}")
            bot_ans = (
                f"Error processing request: {error_msg}" if lang == "en"
                else f"ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล: {error_msg}"
            )

        log_id = await chat_history.save_chat_logs(_build_log_payload(
            room_id=room_id, bu=bu, username=username, message=message, response=bot_ans,
            model_name=model_name, chat_input_tokens=input_tokens, chat_output_tokens=output_tokens,
            intent_tokens=intent_tokens, embed_tokens=embed_tokens,
            rewrite_in=rewrite_in, rewrite_out=rewrite_out, source_debug=source_debug,
            start_time=start_time, lang=lang, intent_type="tech_support",
            was_rewritten=was_rewritten, had_zero_results=False, was_truncated=was_truncated,
            retrieved_chunks=retrieved_chunks, history_count=history_count,
            avg_similarity_score=avg_similarity_score,
            device_type=device_type, referrer_page=referrer_page,
        ))
        total_tokens_map["chat_input"] = input_tokens
        total_tokens_map["chat_output"] = output_tokens
        log_performance(total_tokens_map, 0, time.time() - start_time)
        return {"reply": bot_ans, "sources": source_debug, "room_id": room_id, "message_id": log_id}

    def clear_history(self, room_id: str):
        chat_history.clear_history(room_id)


# Singleton instance
llm_service = LLMService()
chat_service = llm_service  # backward-compat alias (imported by chat_routes.py)
