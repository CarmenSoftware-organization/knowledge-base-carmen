import json
import time
import asyncio
from datetime import datetime

# --- LLM Provider: OpenRouter ---
from langchain_openai import ChatOpenAI

# --- LLM Provider: Ollama ---
from langchain_ollama import ChatOllama

from ..core.config import settings
from .retrieval import retrieval_service
from .prompt import BASE_PROMPT, REWRITE_PROMPT
from . import chat_history


class LLMService:
    def __init__(self):
        self.provider = settings.ACTIVE_LLM_PROVIDER.lower()
        
        if self.provider == "ollama":
            self.default_model = settings.OLLAMA_CHAT_MODEL
            self.api_base = settings.OLLAMA_URL
            self.api_key = None
            print(f"💬 AI Chat Model Initialization Complete (Ollama) using {self.default_model} @ {self.api_base}")
        elif self.provider == "zai":
            self.default_model = settings.ZAI_CHAT_MODEL
            self.api_base = settings.ZAI_API_BASE
            self.api_key = settings.ZAI_API_KEY
            print(f"💬 AI Chat Model Initialization Complete (Z.ai) using {self.default_model}")
        else:
            self.default_model = settings.OPENROUTER_CHAT_MODEL
            self.api_base = "https://openrouter.ai/api/v1"
            self.api_key = settings.OPENROUTER_API_KEY
            print(f"💬 AI Chat Model Initialization Complete (OpenRouter) using {self.default_model}")

    def _create_llm(self, streaming=False):
        """Create the LLM instance based on the active provider."""
        if self.provider == "ollama":
            return ChatOllama(
                model=self.default_model,
                base_url=self.api_base,
                temperature=0.3,
                streaming=streaming,
                num_ctx=4096,
                timeout=300,
            )
        elif self.provider == "zai":
            return ChatOpenAI(
                model=self.default_model,
                openai_api_key=self.api_key,
                openai_api_base=self.api_base,
                temperature=1.0,
                max_tokens=2048,
                streaming=streaming,
                extra_body={"thinking": {"type": "disabled"}},
                **({"stream_usage": True} if streaming else {})
            )
        else:
            return ChatOpenAI(
                model=self.default_model,
                openai_api_key=self.api_key or settings.OPENROUTER_API_KEY,
                openai_api_base=self.api_base,
                temperature=0.3,
                max_tokens=2048,
                streaming=streaming,
                **({"stream_usage": True} if streaming else {})
            )

    def get_active_model(self, override_model: str = None):
        model_name = override_model or self.default_model
        return {"name": model_name, "input_rate": 0, "output_rate": 0}

    # ==========================================
    # 🔄 QUERY REWRITING (for follow-up questions)
    # ==========================================
    async def _rewrite_query(self, message: str, history_text: str) -> tuple[str, int, int]:
        """Rewrite a follow-up question into a standalone query using chat history. 
        Returns (rewritten_query, input_tokens, output_tokens)."""
        input_tokens = 0
        output_tokens = 0
        try:
            llm = self._create_llm(streaming=False)
            prompt = REWRITE_PROMPT.format(history=history_text, question=message)
            response = await llm.ainvoke(prompt)
            
            # Extract token usage from the rewrite call
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
            # Sanity check: if rewrite is too short or too long, use original
            if len(rewritten) < 3 or len(rewritten) > 200:
                return message, input_tokens, output_tokens
            return rewritten, input_tokens, output_tokens
        except Exception as e:
            print(f"⚠️ Query rewrite failed: {e}")
            return message, 0, 0

    # ==========================================
    # 💬 CHAT METHODS
    # ==========================================
    async def stream_chat(self, message: str, bu: str, room_id: str, username: str, model_name: str = None, prompt_extend: str = "", history: list[dict] = None, db_schema: str = "carmen"):
        start_time = time.time()
        model_config = self.get_active_model(model_name)
        
        # Restore history from frontend if present and backend memory is empty
        if history:
            chat_history.restore_history(room_id, history)
            
        history_text = chat_history.get_history_text(room_id)

        # Query Rewriting — rewrite follow-up questions using history context
        search_query = message
        rewrite_input_tokens = 0
        rewrite_output_tokens = 0
        if chat_history.has_history(room_id):
            yield json.dumps({"type": "status", "data": "กำลังวิเคราะห์คำถาม..."}) + "\n"
            await asyncio.sleep(0)
            t0 = time.time()
            search_query, rewrite_input_tokens, rewrite_output_tokens = await self._rewrite_query(message, history_text)
            print(f"⏱️ Rewrite Query Time: {time.time() - t0:.2f}s")
            print(f"🔄 Query Rewrite: \"{message}\" → \"{search_query}\"")

        # Retrieval — use rewritten query for better search results
        yield json.dumps({"type": "status", "data": "กำลังค้นหาเอกสารที่เกี่ยวข้อง..."}) + "\n"
        await asyncio.sleep(0)
        t1 = time.time()
        passed_docs, source_debug = await asyncio.to_thread(retrieval_service.search, search_query, db_schema)
        print(f"⏱️ Document Retrieval Time: {time.time() - t1:.2f}s")
        context_text = "\n\n".join([d.page_content for d in passed_docs]) if passed_docs else ""

        # 📋 Log retrieved sources
        print(f"\n{'='*60}")
        print(f"🔍 Query: {message[:80]}{'...' if len(message) > 80 else ''}")
        print(f"📂 Sources ({len(source_debug)} results):")
        for i, src in enumerate(source_debug, 1):
            print(f"   {i}. [{src.get('score', 'N/A')}] {src.get('source', '?')} — {src.get('title', 'N/A')}")
        if not source_debug:
            print("   ⚠️ No matching documents found.")
        print(f"💬 Chat History: {history_text[:120]}{'...' if len(history_text) > 120 else ''}")
        print(f"{'='*60}\n")

        yield json.dumps({"type": "sources", "data": source_debug}) + "\n"
        yield json.dumps({"type": "status", "data": "กำลังเรียบเรียงคำตอบ..."}) + "\n"
        await asyncio.sleep(0)

        # LLM Logic — send full context with images, let frontend handle rendering
        full_response = ""
        last_chunk = None
        try:
            llm = self._create_llm(streaming=True)
            
            # Format prompt manually (bypass chain to get token metadata from OpenRouter)
            final_prompt_text = BASE_PROMPT
            if prompt_extend:
                final_prompt_text = f"Additional Instructions: {prompt_extend}\n" + final_prompt_text
            
            formatted_prompt = final_prompt_text.format(
                context=context_text,
                question=message,
                chat_history=history_text
            )

            accumulated = None
            first_token_time = None
            async for chunk in llm.astream(formatted_prompt):
                if first_token_time is None:
                    first_token_time = time.time()
                    print(f"⏱️ Time To First Token (TTFT): {first_token_time - start_time:.2f}s (Total time since request started)")
                    
                # Accumulate chunks (merges metadata across all chunks)
                accumulated = chunk if accumulated is None else accumulated + chunk
                if chunk.content:
                    full_response += chunk.content
                    yield json.dumps({"type": "chunk", "data": chunk.content}) + "\n"
            last_chunk = accumulated
        except Exception as e:
            error_msg = str(e)
            print(f"❌ LLM Error: {error_msg}")
            fallback_response = f"ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล: {error_msg}"
            yield json.dumps({"type": "chunk", "data": fallback_response}) + "\n"
            yield json.dumps({"type": "done", "id": 0}) + "\n"
            return

        # 📊 Token usage from API response
        duration = time.time() - start_time
        input_tokens = 0
        output_tokens = 0
        total_tokens = 0
        token_source = "estimated"
        
        if last_chunk:
            # Try usage_metadata (OpenAI/OpenRouter standard)
            usage = getattr(last_chunk, 'usage_metadata', None)
            if usage and isinstance(usage, dict):
                input_tokens = usage.get('input_tokens', 0)
                output_tokens = usage.get('output_tokens', 0)
                total_tokens = usage.get('total_tokens', input_tokens + output_tokens)
                if total_tokens > 0:
                    token_source = "actual"
            
            # Fallback: try response_metadata
            if total_tokens == 0:
                resp_meta = getattr(last_chunk, 'response_metadata', {})
                if resp_meta and 'token_usage' in resp_meta:
                    tu = resp_meta['token_usage']
                    input_tokens = tu.get('prompt_tokens', 0)
                    output_tokens = tu.get('completion_tokens', 0)
                    total_tokens = tu.get('total_tokens', input_tokens + output_tokens)
                    if total_tokens > 0:
                        token_source = "actual"
        
        # Final fallback: byte-based estimation
        if total_tokens == 0:
            input_tokens = len((context_text + message).encode('utf-8')) // 3
            output_tokens = len(full_response.encode('utf-8')) // 3
            
        # Add tokens from the query rewrite step
        input_tokens += rewrite_input_tokens
        output_tokens += rewrite_output_tokens
        total_tokens = input_tokens + output_tokens
        
        print(f"\n📊 Token Usage ({token_source}):")
        print(f"   Input tokens:  {input_tokens}")
        print(f"   Output tokens: {output_tokens}")
        print(f"   Total tokens:  {total_tokens}")
        print(f"⏱️ Response time: {duration:.1f}s\n")

        # Log
        log_id = chat_history.save_chat_logs({
            "room_id": room_id, "bu": bu, "username": username, "user_query": message, "bot_response": full_response,
            "model_name": model_config['name'], "input_rate": model_config['input_rate'], "output_rate": model_config['output_rate'],
            "sources": source_debug, "timestamp": datetime.now(), "duration": duration,
        })
        yield json.dumps({"type": "done", "id": log_id}) + "\n"

    async def invoke_chat(self, message: str, bu: str, room_id: str, username: str, model_name: str = None, prompt_extend: str = "", history: list[dict] = None, db_schema: str = "carmen"):
        start_time = time.time()
        model_config = self.get_active_model(model_name)
        
        # Restore history from frontend if present and backend memory is empty
        if history:
            chat_history.restore_history(room_id, history)
            
        history_text = chat_history.get_history_text(room_id)

        # Query Rewriting for follow-up questions
        search_query = message
        rewrite_input_tokens = 0
        rewrite_output_tokens = 0
        if chat_history.has_history(room_id):
            search_query, rewrite_input_tokens, rewrite_output_tokens = await self._rewrite_query(message, history_text)

        passed_docs, source_debug = retrieval_service.search(search_query, db_schema)
        context_text = "\n\n".join([d.page_content for d in passed_docs]) if passed_docs else ""

        try:
            llm = self._create_llm(streaming=False)
            
            final_prompt_text = BASE_PROMPT
            if prompt_extend:
                final_prompt_text = f"Additional Instructions: {prompt_extend}\n" + final_prompt_text
            
            formatted_prompt = final_prompt_text.format(
                context=context_text,
                question=message,
                chat_history=history_text
            )
            
            response = await llm.ainvoke(formatted_prompt)
            bot_ans = response.content
            
            # Extract token usage
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

        except Exception as e:
            bot_ans = f"ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล: {str(e)}"
            input_tokens = 0
            output_tokens = 0

        # Aggregate tokens
        total_input_tokens = input_tokens + rewrite_input_tokens
        total_output_tokens = output_tokens + rewrite_output_tokens

        log_id = chat_history.save_chat_logs({
            "room_id": room_id, "bu": bu, "username": username, "user_query": message, "bot_response": bot_ans,
            "model_name": model_config['name'], 
            "input_tokens": total_input_tokens, 
            "output_tokens": total_output_tokens,
            "sources": source_debug, "timestamp": datetime.now(), "duration": time.time() - start_time,
        })
        return {"reply": bot_ans, "sources": source_debug, "room_id": room_id, "message_id": log_id}

    # Delegate history methods for router access
    def clear_history(self, room_id: str):
        chat_history.clear_history(room_id)

    def save_chat_logs(self, data: dict):
        return chat_history.save_chat_logs(data)

    def get_chat_history_text(self, room_id: str, limit: int = 4) -> str:
        return chat_history.get_history_text(room_id, limit)


# Singleton instance
chat_service = LLMService()
