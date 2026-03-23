import json
import re
import time
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from ..core.config import settings
from .retrieval import retrieval_service
from .prompt import BASE_PROMPT, REWRITE_PROMPT
from fastapi import Request
from . import chat_history
from .intent_router import intent_router
from ..core.logging_config import log_query, log_intent, log_search, log_performance


class LLMService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.api_base = settings.active_api_base
        self.api_key = settings.active_api_key
        self.default_model = settings.active_chat_model
        print(f"💬 AI Chat Model Initialization Complete ({self.provider.upper()}) using {self.default_model}")

    def _create_llm(self, streaming=False, model_name: str = None, max_tokens: int = None):
        """Create LLM instance (OpenRouter or DeepSeek)."""
        kwargs = dict(
            model=model_name or self.default_model,
            openai_api_key=self.api_key,
            openai_api_base=self.api_base,
            temperature=0.3,
            max_tokens=max_tokens or 8192,
            streaming=streaming,
        )
        # OpenRouter-specific routing parameters (not supported by DeepSeek)
        if self.provider == "openrouter":
            kwargs["extra_body"] = {
                "include_reasoning": False,
                "provider": {
                    "allow_fallbacks": False,
                    "require_parameters": True,
                }
            }
        if streaming:
            kwargs["stream_usage"] = True
        return ChatOpenAI(**kwargs)

    def get_active_model(self, override_model: str = None) -> str:
        return override_model or self.default_model

    def _sanitize_input(self, text: str) -> str:
        """Strip XML-like tags to prevent prompt injection tag breakout."""
        if not text:
            return ""
        return re.sub(r'</?(user_input|context|history|chat_history|manual|system_instruction)[^>]*>', '', text, flags=re.IGNORECASE)

    def _format_error(self, e: Exception, lang: str = "th") -> str:
        """Format raw LLM errors into user-friendly messages, stripping technical metadata/HTML."""
        error_str = str(e)

        # 🛡️ Detect Security Blocks (e.g. 405 from StepFun/OpenRouter)
        if "405" in error_str or "security" in error_str.lower() or "blocked" in error_str.lower():
            return (
                "Security Policy: This request was blocked due to potentially unsafe content."
                if lang == "en" else
                "นโยบายความปลอดภัย: คำขอถูกระงับเนื่องจากตรวจพบบางอย่างที่ไม่เหมาะสม"
            )

        # 🕒 Detect Rate Limits (429)
        if "429" in error_str or "rate limit" in error_str.lower():
            return (
                "Too many requests. Please slow down and try again in a moment."
                if lang == "en" else
                "มีการเรียกใช้งานมากเกินไป กรุณาลองใหม่ในภายหลัง"
            )

        # 🚧 Detect Provider Downtime (5xx)
        if any(code in error_str for code in ["500", "502", "503"]):
            return (
                "The AI service is currently unavailable. Please try again later."
                if lang == "en" else
                "บริการ AI ขัดข้องชั่วคราว กรุณาลองใหม่ในภายหลัง"
            )

        # 🧹 Clean up raw HTML if present (some providers return HTML on 4xx/5xx)
        if "<!doctype" in error_str.lower() or "<html" in error_str.lower():
            match = re.search(r"Error code: (\d+)", error_str)
            code = match.group(1) if match else "Unknown"
            return f"AI Service Error ({code}). Please try again." if lang == "en" else f"เกิดข้อผิดพลาดจากบริการ AI ({code}) กรุณาลองใหม่"

        return error_str

    # ==========================================
    # 🧮 TOKEN BUDGET HELPERS
    # ==========================================
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
        trimmed = []
        used = 0
        for chunk in chunks:
            t = self._estimate_tokens(chunk)
            if used + t > token_budget:
                break
            trimmed.append(chunk)
            used += t
        result = "\n\n".join(trimmed) if trimmed else context_text[:token_budget * 3]
        logger.warning(
            f"⚠️ Context trimmed: ~{self._estimate_tokens(context_text)} → ~{self._estimate_tokens(result)} tokens "
            f"(budget: {token_budget})"
        )
        return result

    # ==========================================
    # 🔄 LLM INVOKE WITH RETRY + FALLBACK
    # ==========================================
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

    # ==========================================
    # 🔄 QUERY REWRITING (for follow-up questions)
    # ==========================================
    async def _rewrite_query(self, message: str, history_text: str) -> tuple[str, int, int]:
        """Rewrite a follow-up question into a standalone query using chat history.
        Returns (rewritten_query, input_tokens, output_tokens)."""
        input_tokens = 0
        output_tokens = 0
        try:
            llm = self._create_llm(
                streaming=False,
                model_name=settings.active_intent_model,
                max_tokens=500
            )

            system_part = REWRITE_PROMPT.split("Conversation:")[0].strip()
            sanitized_message = self._sanitize_input(message)
            human_part = f"Conversation:\n<history>{history_text}</history>\n\nLatest message: <user_input>{sanitized_message}</user_input>\n\nStandalone Query:"

            messages = [
                SystemMessage(content=system_part),
                HumanMessage(content=human_part)
            ]
            response = await llm.ainvoke(messages)

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
            print(f"⚠️ Query rewrite failed: {e}")
            return message, 0, 0

    # ==========================================
    # 💬 CHAT METHODS
    # ==========================================
    async def stream_chat(self, message: str, bu: str, room_id: str, username: str, model_name: str = None, history: list[dict] = None, db_schema: str = "carmen", lang: str = "th", request: Request = None):
        start_time = time.time()
        model_name = self.get_active_model(model_name)

        LOCALES = {
            "th": {
                "status_analyzing": "กำลังวิเคราะห์คำถาม...",
                "status_searching": "กำลังค้นหาและคัดกรองข้อมูล...",
                "status_composing": "กำลังเรียบเรียงคำตอบ...",
                "preface": "จากข้อมูลในคู่มือ",
                "instruction": "Always respond in Thai language. This includes the [SUGGESTIONS] section — all 3 suggested questions MUST be written in Thai only. Never use Chinese or any other language."
            },
            "en": {
                "status_analyzing": "Analyzing your question...",
                "status_searching": "Searching and filtering data...",
                "status_composing": "Composing response...",
                "preface": "Based on the manual",
                "instruction": "Always respond in English language. If the provided manual (คู่มือ) is in Thai, you MUST translate the relevant information into natural English. Do NOT quote Thai text directly; provide the English translation of the information instead."
            }
        }
        ttft = 0.0

        history_count = len(history) if history else 0
        log_query(message, history_count)

        l = LOCALES.get(lang or "th", LOCALES["th"])

        # 🛡️ STEP 0: INTENT DETECTION
        have_history = chat_history.has_history(room_id)
        intent_type, quick_reply, intent_tokens = await intent_router.detect_intent(message, lang, have_history=have_history)
        log_intent(intent_type, settings.active_intent_model, intent_tokens)

        total_tokens_map = {
            "intent": intent_tokens,
            "rewrite": (0, 0),
            "chat_input": 0,
            "chat_output": 0
        }

        if intent_type in ["greeting", "thanks", "out_of_scope", "company_info", "capabilities"]:
            duration = time.time() - start_time
            yield json.dumps({"type": "chunk", "data": quick_reply}) + "\n"
            log_id = await chat_history.save_chat_logs({
                "room_id": room_id, "bu": bu, "username": username, "user_query": message, "bot_response": quick_reply,
                "model_name": settings.active_intent_model, "input_tokens": intent_tokens[0], "output_tokens": intent_tokens[1],
                "sources": [], "timestamp": datetime.now(), "duration": duration,
                "lang": lang, "intent_type": intent_type,
                "was_rewritten": False, "had_zero_results": False, "was_truncated": False,
                "retrieved_chunks": 0, "history_length": history_count, "ttft_ms": 0,
            })
            yield json.dumps({"type": "done", "id": log_id}) + "\n"
            ttft = duration
            log_performance(total_tokens_map, ttft, duration)
            return

        if history:
            chat_history.restore_history(room_id, history)

        history_text = chat_history.get_history_text(room_id)
        logger.info(f"⚡ Processing as TECH_SUPPORT: '{message}'")

        # Query Rewriting — rewrite follow-up questions using history context
        search_query = message
        was_rewritten = False
        if chat_history.has_history(room_id):
            if request and await request.is_disconnected():
                logger.warning("🛑 Client disconnected before rewrite. stopping...")
                return
            yield json.dumps({"type": "status", "data": l["status_analyzing"]}) + "\n"
            await asyncio.sleep(0)
            t0 = time.time()
            search_query, rewrite_in, rewrite_out = await self._rewrite_query(message, history_text)
            was_rewritten = search_query != message
            total_tokens_map["rewrite"] = (rewrite_in, rewrite_out)
            logger.info(f"⏱️ Rewrite Query Time: {time.time() - t0:.2f}s")
            logger.info(f"🔄 Query Rewrite: \"{message}\" → \"{search_query}\"")

        if request and await request.is_disconnected():
            logger.warning("🛑 Client disconnected before retrieval. stopping...")
            return
        yield json.dumps({"type": "status", "data": l["status_searching"]}) + "\n"
        await asyncio.sleep(0)
        passed_docs, source_debug = await retrieval_service.search(search_query, db_schema)
        log_search(search_query, passed_docs)

        retrieved_chunks = len(passed_docs)

        if not passed_docs:
            duration = time.time() - start_time
            reply = intent_router.canned_responses["out_of_scope"].get(lang, intent_router.canned_responses["out_of_scope"]["th"])
            yield json.dumps({"type": "chunk", "data": reply}) + "\n"
            log_id = await chat_history.save_chat_logs({
                "room_id": room_id, "bu": bu, "username": username, "user_query": message, "bot_response": reply,
                "model_name": "zero_result_safeguard", "input_tokens": 0, "output_tokens": 0,
                "sources": [], "timestamp": datetime.now(), "duration": duration,
                "lang": lang, "intent_type": "tech_support",
                "was_rewritten": was_rewritten, "had_zero_results": True, "was_truncated": False,
                "retrieved_chunks": 0, "history_length": history_count, "ttft_ms": 0,
            })
            yield json.dumps({"type": "done", "id": log_id}) + "\n"
            log_performance(total_tokens_map, 0, time.time() - start_time)
            return

        context_text = "\n\n".join([d.page_content for d in passed_docs])

        yield json.dumps({"type": "sources", "data": source_debug}) + "\n"
        if request and await request.is_disconnected():
            print("🛑 Client disconnected before composing answer. stopping...")
            return
        yield json.dumps({"type": "status", "data": l["status_composing"]}) + "\n"
        await asyncio.sleep(0)

        full_response = ""
        last_chunk = None
        was_truncated = False
        try:
            system_base = BASE_PROMPT.split("data_input:")[0].strip()
            system_content = system_base.replace("the designated preface phrase", f"'{l['preface']}'")
            lang_map = {"th": "Thai", "en": "English"}
            target_lang = lang_map.get(lang, "Thai")
            system_content = system_content.replace("the requested language", target_lang)
            lang_instruction = f"\n\nIMPORTANT: {l['instruction']}"

            # 🧮 Dynamic token budget: trim context to fit within MAX_PROMPT_TOKENS
            system_tokens = self._estimate_tokens(system_content + lang_instruction)
            history_tokens = self._estimate_tokens(history_text)
            question_tokens = self._estimate_tokens(message)
            context_budget = settings.MAX_PROMPT_TOKENS - system_tokens - history_tokens - question_tokens - 300
            if context_budget > 0:
                context_text = self._trim_context(context_text, context_budget)

            sanitized_message = self._sanitize_input(message)
            messages = [
                SystemMessage(content=system_content + lang_instruction),
                HumanMessage(content=f"คู่มือ:\n<context>{context_text}</context>\n\nChat History:\n<chat_history>{history_text}</chat_history>\n\nQuestion: <user_input>{sanitized_message}</user_input>\n\nAnswer:")
            ]

            # 🔄 Fallback model loop: try primary → fallback (only if no content yielded yet)
            models_to_try = [model_name]
            if settings.OPENROUTER_FALLBACK_MODEL and settings.OPENROUTER_FALLBACK_MODEL != model_name:
                models_to_try.append(settings.OPENROUTER_FALLBACK_MODEL)

            accumulated = None
            first_token_time = None
            yielded_text_len = 0
            tag = "[SUGGESTIONS]"
            stream_finish_reason = None
            content_yielded = False

            for current_model in models_to_try:
                accumulated = None
                first_token_time = None
                yielded_text_len = 0
                stream_finish_reason = None
                full_response = ""
                content_yielded = False

                try:
                    llm = self._create_llm(streaming=True, model_name=current_model)
                    async for chunk in llm.astream(messages):
                        if request and await request.is_disconnected():
                            print("🛑 Client disconnected during streaming. stopping...")
                            partial_duration = time.time() - start_time
                            partial_input, partial_output = 0, 0
                            if accumulated:
                                usage = getattr(accumulated, 'usage_metadata', None)
                                if usage and isinstance(usage, dict):
                                    partial_input = usage.get('input_tokens', 0)
                                    partial_output = usage.get('output_tokens', 0)
                            if partial_input == 0 and partial_output == 0:
                                partial_input = len((context_text + message).encode('utf-8')) // 3
                                partial_output = len(full_response.encode('utf-8')) // 3
                            total_tokens_map["chat_input"] = partial_input
                            total_tokens_map["chat_output"] = partial_output
                            log_performance(total_tokens_map, ttft, partial_duration)
                            await chat_history.save_chat_logs({
                                "room_id": room_id, "bu": bu, "username": username,
                                "user_query": message, "bot_response": full_response,
                                "model_name": current_model, "input_tokens": partial_input, "output_tokens": partial_output,
                                "sources": source_debug, "timestamp": datetime.now(), "duration": partial_duration,
                                "lang": lang, "intent_type": "tech_support",
                                "was_rewritten": was_rewritten, "had_zero_results": False, "was_truncated": False,
                                "retrieved_chunks": retrieved_chunks, "history_length": history_count,
                                "ttft_ms": round(ttft * 1000),
                            })
                            return
                        if first_token_time is None and chunk.content:
                            first_token_time = time.time()
                            ttft = first_token_time - start_time
                            print(f"⏱️ Time To First Token (TTFT): {ttft:.2f}s (Total time since request started)")

                        # Capture finish_reason per-chunk (accumulation causes string concat bug)
                        chunk_meta = getattr(chunk, 'response_metadata', {})
                        chunk_finish = chunk_meta.get('finish_reason') or chunk_meta.get('stop_reason')
                        if chunk_finish:
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
                                # Hold back any partial tag suffix to avoid yielding incomplete tag
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
                        raise  # partial content already sent — cannot restart cleanly
                    logger.warning(f"⚠️ Model {current_model} failed before yielding content: {model_err}")
                    if current_model == models_to_try[-1]:
                        raise  # no more fallbacks
                    continue

                break  # streaming completed successfully

            # Yield any remaining text if the tag was NOT found at all
            if tag not in full_response and yielded_text_len < len(full_response):
                remaining = full_response[yielded_text_len:]
                yield json.dumps({"type": "chunk", "data": remaining}) + "\n"
                yielded_text_len += len(remaining)

            last_chunk = accumulated

            # Extract suggestions
            suggestions = []
            suggestion_match = re.search(r'\[SUGGESTIONS\]\s*(\{.*\}|\[.*\])', full_response, re.DOTALL)

            if suggestion_match:
                tag_start_index = full_response.find(tag)
                raw_suggestions_content = suggestion_match.group(1)
                full_response = full_response[:tag_start_index].strip()
                try:
                    clean_json = raw_suggestions_content.replace("```json", "").replace("```", "").strip()
                    suggestions = json.loads(clean_json)
                except Exception as e:
                    print(f"⚠️ Failed to parse suggestions regex match: {e}")
            elif tag in full_response:
                parts = full_response.split(tag)
                full_response = parts[0].strip()
                try:
                    suggestions_json = parts[1].replace("```json", "").replace("```", "").strip()
                    suggestions = json.loads(suggestions_json)
                except Exception as e:
                    print(f"⚠️ Failed to parse suggestions fallback: {e}")

            if suggestions:
                yield json.dumps({"type": "suggestions", "data": suggestions}) + "\n"

            # 🔍 Check if response was cut short by max_tokens
            # Note: OpenAI uses "length", Anthropic/some providers use "max_tokens"
            if stream_finish_reason in ("length", "max_tokens"):
                was_truncated = True
                truncation_notice = (
                    "\n\n_(The response was too long to complete in one reply. Try asking about a specific part of the topic instead.)_"
                    if lang == "en" else
                    "\n\n_(คำตอบนี้ยาวเกินกว่าที่ระบบจะแสดงได้ในครั้งเดียว หากต้องการข้อมูลเพิ่มเติม ลองถามแยกเป็นหัวข้อย่อย ๆ ได้เลยครับ)_"
                )
                full_response += truncation_notice
                yield json.dumps({"type": "chunk", "data": truncation_notice}) + "\n"
                logger.warning(f"⚠️ LLM response truncated due to max_tokens (finish_reason={stream_finish_reason})")
            elif not full_response.strip():
                empty_notice = (
                    "_(The AI could not generate a response. The token limit may be too small for this question.)_"
                    if lang == "en" else
                    "_(AI ไม่สามารถสร้างคำตอบได้ ขีดจำกัด token อาจน้อยเกินไปสำหรับคำถามนี้)_"
                )
                full_response = empty_notice
                yield json.dumps({"type": "chunk", "data": empty_notice}) + "\n"
                logger.warning("⚠️ LLM returned empty response — possible max_tokens too small")

        except Exception as e:
            error_msg = self._format_error(e, lang)
            print(f"❌ LLM Error: {e}")
            fallback_response = f"Error processing request: {error_msg}" if lang == "en" else f"ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล: {error_msg}"
            yield json.dumps({"type": "chunk", "data": fallback_response}) + "\n"
            yield json.dumps({"type": "done", "id": 0}) + "\n"
            return

        # 📊 Token usage from API response
        duration = time.time() - start_time
        input_tokens = 0
        output_tokens = 0
        total_tokens = 0

        if last_chunk:
            usage = getattr(last_chunk, 'usage_metadata', None)
            if usage and isinstance(usage, dict):
                input_tokens = usage.get('input_tokens', 0)
                output_tokens = usage.get('output_tokens', 0)
                total_tokens = usage.get('total_tokens', input_tokens + output_tokens)

            if total_tokens == 0:
                resp_meta = getattr(last_chunk, 'response_metadata', {})
                if resp_meta and 'token_usage' in resp_meta:
                    tu = resp_meta['token_usage']
                    input_tokens = tu.get('prompt_tokens', 0)
                    output_tokens = tu.get('completion_tokens', 0)
                    total_tokens = tu.get('total_tokens', input_tokens + output_tokens)

        if total_tokens == 0:
            input_tokens = len((context_text + message).encode('utf-8')) // 3
            output_tokens = len(full_response.encode('utf-8')) // 3

        total_tokens_map["chat_input"] = input_tokens
        total_tokens_map["chat_output"] = output_tokens
        log_performance(total_tokens_map, ttft, duration)

        log_id = await chat_history.save_chat_logs({
            "room_id": room_id, "bu": bu, "username": username, "user_query": message, "bot_response": full_response,
            "model_name": model_name, "input_tokens": input_tokens, "output_tokens": output_tokens,
            "sources": source_debug, "timestamp": datetime.now(), "duration": duration,
            "lang": lang, "intent_type": "tech_support",
            "was_rewritten": was_rewritten, "had_zero_results": False, "was_truncated": was_truncated,
            "retrieved_chunks": retrieved_chunks, "history_length": history_count,
            "ttft_ms": round(ttft * 1000),
        })
        yield json.dumps({"type": "done", "id": log_id}) + "\n"

    async def invoke_chat(self, message: str, bu: str, room_id: str, username: str, model_name: str = None, history: list[dict] = None, db_schema: str = "carmen", lang: str = "th"):
        start_time = time.time()
        model_name = self.get_active_model(model_name)

        history_count = len(history) if history else 0
        log_query(message, history_count)

        LOCALES = {
            "th": {"preface": "จากข้อมูลในคู่มือ", "instruction": "Always respond in Thai language. This includes the [SUGGESTIONS] section — all 3 suggested questions MUST be written in Thai only. Never use Chinese or any other language."},
            "en": {"preface": "Based on the manual", "instruction": "Always respond in English language. If the manual is in Thai, translate relevant parts into English. No direct Thai quotes."}
        }
        l = LOCALES.get(lang or "th", LOCALES["th"])

        # 🛡️ STEP 0: INTENT DETECTION
        have_history = chat_history.has_history(room_id)
        intent_type, quick_reply, intent_tokens = await intent_router.detect_intent(message, lang, have_history=have_history)
        log_intent(intent_type, settings.active_intent_model, intent_tokens)

        total_tokens_map = {
            "intent": intent_tokens,
            "rewrite": (0, 0),
            "chat_input": 0,
            "chat_output": 0
        }

        if intent_type in ["greeting", "thanks", "out_of_scope", "company_info", "capabilities"]:
            log_id = await chat_history.save_chat_logs({
                "room_id": room_id, "bu": bu, "username": username, "user_query": message, "bot_response": quick_reply,
                "model_name": settings.active_intent_model,
                "input_tokens": intent_tokens[0], "output_tokens": intent_tokens[1],
                "sources": [], "timestamp": datetime.now(), "duration": time.time() - start_time,
                "lang": lang, "intent_type": intent_type,
                "was_rewritten": False, "had_zero_results": False, "was_truncated": False,
                "retrieved_chunks": 0, "history_length": history_count, "ttft_ms": 0,
            })
            log_performance(total_tokens_map, 0, time.time() - start_time)
            return {"reply": quick_reply, "sources": [], "room_id": room_id, "message_id": log_id}

        if history:
            chat_history.restore_history(room_id, history)

        history_text = chat_history.get_history_text(room_id)
        logger.info(f"⚡ Processing as TECH_SUPPORT: '{message}'")

        search_query = message
        was_rewritten = False
        if chat_history.has_history(room_id):
            search_query, rewrite_in, rewrite_out = await self._rewrite_query(message, history_text)
            was_rewritten = search_query != message
            total_tokens_map["rewrite"] = (rewrite_in, rewrite_out)

        passed_docs, source_debug = await retrieval_service.search(search_query, db_schema)
        retrieved_chunks = len(passed_docs)

        if not passed_docs:
            reply = intent_router.canned_responses["out_of_scope"].get(lang, intent_router.canned_responses["out_of_scope"]["th"])
            log_id = await chat_history.save_chat_logs({
                "room_id": room_id, "bu": bu, "username": username, "user_query": message, "bot_response": reply,
                "model_name": "zero_result_safeguard", "input_tokens": 0, "output_tokens": 0,
                "sources": [], "timestamp": datetime.now(), "duration": time.time() - start_time,
                "lang": lang, "intent_type": "tech_support",
                "was_rewritten": was_rewritten, "had_zero_results": True, "was_truncated": False,
                "retrieved_chunks": 0, "history_length": history_count, "ttft_ms": 0,
            })
            duration = time.time() - start_time
            log_performance(total_tokens_map, duration, duration)
            return {"reply": reply, "sources": [], "room_id": room_id, "message_id": log_id}

        context_text = "\n\n".join([d.page_content for d in passed_docs])

        input_tokens = 0
        output_tokens = 0
        was_truncated = False
        try:
            system_base = BASE_PROMPT.split("data_input:")[0].strip()
            system_content = system_base.replace("the designated preface phrase", f"'{l['preface']}'")
            lang_map = {"th": "Thai", "en": "English"}
            target_lang = lang_map.get(lang, "Thai")
            system_content = system_content.replace("the requested language", target_lang)
            lang_instruction = f"\n\nIMPORTANT: {l['instruction']}"

            # 🧮 Dynamic token budget: trim context to fit within MAX_PROMPT_TOKENS
            system_tokens = self._estimate_tokens(system_content + lang_instruction)
            history_tokens = self._estimate_tokens(history_text)
            question_tokens = self._estimate_tokens(message)
            context_budget = settings.MAX_PROMPT_TOKENS - system_tokens - history_tokens - question_tokens - 300
            if context_budget > 0:
                context_text = self._trim_context(context_text, context_budget)

            sanitized_message = self._sanitize_input(message)
            messages = [
                SystemMessage(content=system_content + lang_instruction),
                HumanMessage(content=f"คู่มือ:\n<context>{context_text}</context>\n\nChat History:\n<chat_history>{history_text}</chat_history>\n\nQuestion: <user_input>{sanitized_message}</user_input>\n\nAnswer:")
            ]

            response = await self._invoke_with_retry(messages, model_name)
            bot_ans = response.content

            # 🔍 Check if response was cut short by max_tokens
            # Note: OpenAI uses "length", Anthropic/some providers use "max_tokens"
            resp_meta = getattr(response, 'response_metadata', {})
            finish_reason = resp_meta.get('finish_reason') or resp_meta.get('stop_reason')
            if finish_reason in ("length", "max_tokens"):
                was_truncated = True
                truncation_notice = (
                    "\n\n_(The response was too long to complete in one reply. Try asking about a specific part of the topic instead.)_"
                    if lang == "en" else
                    "\n\n_(คำตอบนี้ยาวเกินกว่าที่ระบบจะแสดงได้ในครั้งเดียว หากต้องการข้อมูลเพิ่มเติม ลองถามแยกเป็นหัวข้อย่อย ๆ ได้เลยครับ)_"
                )
                bot_ans += truncation_notice
                logger.warning(f"⚠️ LLM response truncated due to max_tokens (finish_reason={finish_reason})")
            elif not bot_ans.strip():
                bot_ans = (
                    "_(The AI could not generate a response. The token limit may be too small for this question.)_"
                    if lang == "en" else
                    "_(AI ไม่สามารถสร้างคำตอบได้ ขีดจำกัด token อาจน้อยเกินไปสำหรับคำถามนี้)_"
                )
                logger.warning("⚠️ LLM returned empty response — possible max_tokens too small")

            # Extract token usage
            if resp_meta and 'token_usage' in resp_meta:
                tu = resp_meta['token_usage']
                input_tokens = tu.get('prompt_tokens', 0)
                output_tokens = tu.get('completion_tokens', 0)
            else:
                usage = getattr(response, 'usage_metadata', None)
                if usage and isinstance(usage, dict):
                    input_tokens = usage.get('input_tokens', 0)
                    output_tokens = usage.get('output_tokens', 0)

        except Exception as e:
            error_msg = self._format_error(e, lang)
            print(f"❌ LLM Error: {e}")
            bot_ans = f"Error processing request: {error_msg}" if lang == "en" else f"ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล: {error_msg}"

        log_id = await chat_history.save_chat_logs({
            "room_id": room_id, "bu": bu, "username": username, "user_query": message, "bot_response": bot_ans,
            "model_name": model_name, "input_tokens": input_tokens, "output_tokens": output_tokens,
            "sources": source_debug, "timestamp": datetime.now(), "duration": time.time() - start_time,
            "lang": lang, "intent_type": "tech_support",
            "was_rewritten": was_rewritten, "had_zero_results": False, "was_truncated": was_truncated,
            "retrieved_chunks": retrieved_chunks, "history_length": history_count, "ttft_ms": 0,
        })
        total_tokens_map["chat_input"] = input_tokens
        total_tokens_map["chat_output"] = output_tokens
        log_performance(total_tokens_map, 0, time.time() - start_time)
        return {"reply": bot_ans, "sources": source_debug, "room_id": room_id, "message_id": log_id}

    def clear_history(self, room_id: str):
        chat_history.clear_history(room_id)

    def save_chat_logs(self, data: dict):
        return chat_history.save_chat_logs(data)

    def get_chat_history_text(self, room_id: str) -> str:
        return chat_history.get_history_text(room_id)


# Singleton instance
chat_service = LLMService()
