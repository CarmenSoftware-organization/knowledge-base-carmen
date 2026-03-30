import re
import time
import json
import asyncio
import logging
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

# ==========================================
# 💬 CHAT HISTORY (Frontend-Only / Stateless)
# ==========================================

from cachetools import LRUCache
from ..core.config import settings
from ..core.database import AsyncSessionLocal
from ..core.pii import mask_pii, hash_user_id

# Load from tuning.yaml — edit that file to adjust these limits.
_history_tuning = settings.TUNING.get("history", {})
HISTORY_CONTEXT_LIMIT = int(_history_tuning.get("context_limit", 4))   # messages injected into LLM prompt
HISTORY_MEMORY_LIMIT  = int(_history_tuning.get("memory_limit",  20))  # messages kept in LRU cache per room

# Temporary per-request cache (populated from frontend history each request)
# Limit to 50 rooms to prevent memory leaks
_request_history = LRUCache(maxsize=50)

def clean_for_history(text: str, max_len: int = 200) -> str:
    """Strip images, HTML, videos from text before storing in chat history."""
    t = text
    t = re.sub(r'!\[[^\]]*\]\([^)]+\)', '', t)
    t = re.sub(r'<[^>]+>', '', t)
    t = re.sub(r'https?://(?:www\.)?(?:youtube\.com|youtu\.be)/\S+', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    if len(t) > max_len:
        t = t[:max_len] + '...'
    return t


def get_history_text(room_id: str, limit: int = HISTORY_CONTEXT_LIMIT) -> str:
    """Get formatted chat history text for prompt injection.
    Defaults to HISTORY_CONTEXT_LIMIT (last 4 messages = 2 Q&A pairs)."""
    if room_id not in _request_history or not _request_history[room_id]:
        return "(ไม่มีบทสนทนาก่อนหน้า)"

    history = _request_history[room_id][-limit:]
    lines = []
    pair_num = 0
    for h in history:
        if h.get('sender') == 'user':
            pair_num += 1
            lines.append(f"[{pair_num}] ผู้ใช้: {h.get('message', '')}")
        else:
            lines.append(f"[{pair_num}] Carmen: {h.get('message', '')}")
    return "\n".join(lines)


def has_history(room_id: str) -> bool:
    """Check if a room has enough chat history to warrant query rewriting.
    Requires at least 2 messages (1 complete user+bot pair) to avoid
    wasting tokens on the first question in a room."""
    return room_id in _request_history and len(_request_history[room_id]) >= 2


def clear_history(room_id: str):
    """Clear temporary request cache for a room."""
    if room_id in _request_history:
        del _request_history[room_id]


def restore_history(room_id: str, frontend_history: list[dict] = None):
    """Load chat history from frontend localStorage into temporary memory (PII masked)."""
    if not frontend_history:
        return

    _request_history[room_id] = []
    for msg in frontend_history:
        sender = msg.get("sender", "user")
        _request_history[room_id].append({
            "sender": sender,
            "message": mask_pii(clean_for_history(msg.get("message", ""))),
            "timestamp": msg.get("timestamp", "")
        })

    if len(_request_history[room_id]) > HISTORY_MEMORY_LIMIT:
        _request_history[room_id] = _request_history[room_id][-HISTORY_MEMORY_LIMIT:]


async def _save_to_db_direct(data: dict) -> int:
    """Save Q&A directly to public.chat_history. Returns the new row id, or 0 on failure."""
    from sqlalchemy import text
    from .retrieval import retrieval_service
    from . import pricing

    bu = data.get("bu", "carmen")
    username = hash_user_id(data.get("username", "anonymous"), settings.PRIVACY_HMAC_SECRET)
    user_query = mask_pii((data.get("user_query") or "").strip())
    bot_response = (data.get("bot_response") or "").strip()
    sources_raw = data.get("sources") or []

    if not user_query or not bot_response:
        return 0

    # Analytics fields
    lang = data.get("lang") or None
    intent_type = data.get("intent_type") or None
    model_name = data.get("model_name") or None
    chat_input_tokens = data.get("chat_input_tokens") or 0
    chat_output_tokens = data.get("chat_output_tokens") or 0
    intent_input_tokens = data.get("intent_input_tokens") or 0
    intent_output_tokens = data.get("intent_output_tokens") or 0
    rewrite_input_tokens = data.get("rewrite_input_tokens") or 0
    rewrite_output_tokens = data.get("rewrite_output_tokens") or 0
    embed_model = data.get("embed_model") or settings.LLM_EMBED_MODEL
    intent_model = data.get("intent_model") or settings.active_intent_model
    avg_similarity_score = data.get("avg_similarity_score")  # None = no retrieval
    answer_length = data.get("answer_length") or 0
    device_type = data.get("device_type") or "unknown"
    referrer_page = data.get("referrer_page") or None

    # Build metrics JSONB from optional operational fields
    metrics: dict = {}
    duration = data.get("duration")
    if duration is not None:
        metrics["duration_ms"] = round(duration * 1000)
    ttft_ms = data.get("ttft_ms")
    if ttft_ms is not None:
        metrics["ttft_ms"] = ttft_ms
    for bool_key in ("was_truncated", "had_zero_results", "was_rewritten"):
        val = data.get(bool_key)
        if val is not None:
            metrics[bool_key] = val
    retrieved_chunks = data.get("retrieved_chunks")
    if retrieved_chunks is not None:
        metrics["retrieved_chunks"] = retrieved_chunks
    history_length = data.get("history_length")
    if history_length is not None:
        metrics["history_length"] = history_length
    metrics_json = json.dumps(metrics) if metrics else None

    async with AsyncSessionLocal() as db:
        try:
            # Get bu_id from business_units
            result = await db.execute(
                text("SELECT id FROM public.business_units WHERE slug = :slug LIMIT 1"),
                {"slug": bu},
            )
            row = result.fetchone()
            if not row:
                logger.warning(f"bu '{bu}' not found in business_units")
                return 0
            bu_id = row[0]

            # Create question_embedding + capture save embed tokens
            emb_str = None
            save_embed_tokens = 0
            if retrieval_service.embeddings:
                try:
                    emb, save_embed_tokens = await retrieval_service.get_embedding(user_query)
                    emb_str = retrieval_service.format_pgvector(emb)
                except Exception as e:
                    logger.warning(f"embedding failed: {e}")

            # รวม embed tokens ทั้งหมด (retrieval + intent + save)
            embed_tokens = (data.get("embed_tokens") or 0) + save_embed_tokens

            # คำนวณ total_tokens รวมทุก operation
            total_tokens = (
                embed_tokens
                + intent_input_tokens + intent_output_tokens
                + rewrite_input_tokens + rewrite_output_tokens
                + chat_input_tokens + chat_output_tokens
            )

            # คำนวณ cost_usd
            cost_usd = await pricing.calculate_request_cost(
                embed_tokens=embed_tokens,
                intent_input=intent_input_tokens,
                intent_output=intent_output_tokens,
                rewrite_input=rewrite_input_tokens,
                rewrite_output=rewrite_output_tokens,
                chat_input=chat_input_tokens,
                chat_output=chat_output_tokens,
                chat_model=model_name or "",
                embed_model=embed_model,
                intent_model=intent_model,
            )

            # Map sources to jsonb format
            sources_list = [
                {"articleId": s.get("source", ""), "title": s.get("title", "")}
                for s in sources_raw
                if isinstance(s, dict)
            ]
            sources_json = json.dumps(sources_list)

            params = {
                "bu_id": bu_id,
                "user_id": username,
                "question": user_query,
                "answer": bot_response,
                "sources_json": sources_json,
                "lang": lang,
                "intent_type": intent_type,
                "model_name": model_name,
                "chat_input_tokens": chat_input_tokens or 0,
                "chat_output_tokens": chat_output_tokens or 0,
                "intent_input_tokens": intent_input_tokens or 0,
                "intent_output_tokens": intent_output_tokens or 0,
                "embed_tokens": embed_tokens or 0,
                "rewrite_input_tokens": rewrite_input_tokens or 0,
                "rewrite_output_tokens": rewrite_output_tokens or 0,
                "total_tokens": total_tokens or 0,
                "cost_usd": cost_usd,
                "metrics_json": metrics_json,
                "avg_similarity_score": avg_similarity_score,
                "answer_length": answer_length or 0,
                "device_type": device_type,
                "referrer_page": referrer_page,
                "embed_model": embed_model,
                "intent_model": intent_model,
            }

            if emb_str:
                params["emb_str"] = emb_str
                result = await db.execute(
                    text("""
                        INSERT INTO public.chat_history
                        (bu_id, user_id, question, answer, sources, question_embedding,
                         lang, intent_type, model_name, chat_input_tokens, chat_output_tokens,
                         intent_input_tokens, intent_output_tokens,
                         embed_tokens, rewrite_input_tokens, rewrite_output_tokens,
                         total_tokens, cost_usd, metrics,
                         avg_similarity_score, answer_length, device_type, referrer_page,
                         embed_model, intent_model, created_at)
                        VALUES (:bu_id, :user_id, :question, :answer, CAST(:sources_json AS jsonb),
                                CAST(:emb_str AS vector),
                                :lang, :intent_type, :model_name, :chat_input_tokens, :chat_output_tokens,
                                :intent_input_tokens, :intent_output_tokens,
                                :embed_tokens, :rewrite_input_tokens, :rewrite_output_tokens,
                                :total_tokens, :cost_usd, CAST(:metrics_json AS jsonb),
                                :avg_similarity_score, :answer_length, :device_type, :referrer_page,
                                :embed_model, :intent_model, now())
                        RETURNING id
                    """),
                    params,
                )
            else:
                result = await db.execute(
                    text("""
                        INSERT INTO public.chat_history
                        (bu_id, user_id, question, answer, sources,
                         lang, intent_type, model_name, chat_input_tokens, chat_output_tokens,
                         intent_input_tokens, intent_output_tokens,
                         embed_tokens, rewrite_input_tokens, rewrite_output_tokens,
                         total_tokens, cost_usd, metrics,
                         avg_similarity_score, answer_length, device_type, referrer_page,
                         embed_model, intent_model, created_at)
                        VALUES (:bu_id, :user_id, :question, :answer, CAST(:sources_json AS jsonb),
                                :lang, :intent_type, :model_name, :chat_input_tokens, :chat_output_tokens,
                                :intent_input_tokens, :intent_output_tokens,
                                :embed_tokens, :rewrite_input_tokens, :rewrite_output_tokens,
                                :total_tokens, :cost_usd, CAST(:metrics_json AS jsonb),
                                :avg_similarity_score, :answer_length, :device_type, :referrer_page,
                                :embed_model, :intent_model, now())
                        RETURNING id
                    """),
                    params,
                )
            row = result.fetchone()
            row_id = row[0] if row else 0
            await db.commit()
            logger.info(f"Saved to DB id={row_id} (bu={bu}, total_tokens={total_tokens}, cost_usd={cost_usd})")
            return row_id
        except Exception as e:
            await db.rollback()
            logger.error(f"Save failed: {e}")
            return 0


async def save_chat_logs(data: dict) -> int:
    """Save Q&A to DB. Tries: 1) Go backend (if GO_BACKEND_URL set), 2) Direct DB insert."""
    ts = int(time.time())
    bu = data.get("bu", "carmen")
    username = hash_user_id(data.get("username", "anonymous"), settings.PRIVACY_HMAC_SECRET)
    user_query = mask_pii((data.get("user_query") or "").strip())
    bot_response = (data.get("bot_response") or "").strip()
    sources_raw = data.get("sources") or []

    if not user_query or not bot_response:
        return ts

    logger.debug(f"Saving (bu={bu}, q_len={len(user_query)})")

    # 1) Try Go backend first (when Go is running)
    go_url = getattr(settings, "GO_BACKEND_URL", "") or ""
    if go_url:
        sources = [
            {"articleId": s.get("source", ""), "title": s.get("title", "")}
            for s in sources_raw
            if isinstance(s, dict)
        ]
        payload = json.dumps({
            "bu": bu,
            "user_id": username,
            "question": user_query,
            "answer": bot_response,
            "sources": sources,
        }).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        internal_key = getattr(settings, "GO_BACKEND_INTERNAL_API_KEY", "") or ""
        if internal_key:
            headers["X-Internal-API-Key"] = internal_key
        req = urllib.request.Request(
            f"{go_url}/api/chat/record-history",
            data=payload,
            headers=headers,
            method="POST",
        )
        try:
            def _do_request():
                with urllib.request.urlopen(req, timeout=5) as resp:
                    return resp.status

            status = await asyncio.to_thread(_do_request)
            if status in (200, 201):
                # Go backend doesn't return DB row ID — fall through to direct DB
                # so we can get the real ID for feedback linking.
                pass
        except urllib.error.HTTPError as e:
            logger.warning(f"Go backend failed: {e.code}, using direct DB")
        except Exception as e:
            logger.warning(f"Go backend error: {e}, using direct DB")

    # 2) Save directly to DB to get the actual row ID for feedback linking.
    row_id = await _save_to_db_direct(data)
    return row_id if row_id else ts

