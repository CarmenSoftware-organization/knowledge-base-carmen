import re
import time
import json
import urllib.request
import urllib.error

# ==========================================
# 💬 CHAT HISTORY (Frontend-Only / Stateless)
# ==========================================

from cachetools import LRUCache
from ..core.config import settings
from ..core.database import SessionLocal

# Temporary per-request cache (populated from frontend history each request)
# Limit to 20 rooms to prevent memory leaks
_request_history = LRUCache(maxsize=20)

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


def get_history_text(room_id: str, limit: int = 4) -> str:
    """Get formatted chat history text for prompt injection."""
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
    """Load chat history from frontend localStorage into temporary memory."""
    if not frontend_history:
        return

    _request_history[room_id] = []
    for msg in frontend_history:
        sender = msg.get("sender", "user")
        _request_history[room_id].append({
            "sender": sender,
            "message": clean_for_history(msg.get("message", "")),
            "timestamp": msg.get("timestamp", "")
        })

    # Keep max 50 messages
    if len(_request_history[room_id]) > 50:
        _request_history[room_id] = _request_history[room_id][-50:]


def _save_to_db_direct(data: dict) -> bool:
    """Save Q&A directly to public.chat_history. Returns True on success."""
    from sqlalchemy import text
    from .retrieval import retrieval_service

    bu = data.get("bu", "carmen")
    username = data.get("username", "anonymous")
    user_query = (data.get("user_query") or "").strip()
    bot_response = (data.get("bot_response") or "").strip()
    sources_raw = data.get("sources") or []

    if not user_query or not bot_response:
        return False

    db = SessionLocal()
    try:
        # Get bu_id from business_units
        row = db.execute(
            text("SELECT id FROM public.business_units WHERE slug = :slug LIMIT 1"),
            {"slug": bu},
        ).fetchone()
        if not row:
            print(f"[chat_history] bu '{bu}' not found in business_units")
            return False
        bu_id = row[0]

        # Create embedding if available (optional - can save without for cache-by-similarity)
        emb_str = None
        if retrieval_service.embeddings:
            try:
                emb = retrieval_service.embeddings.embed_query(user_query)
                emb_str = retrieval_service.format_pgvector(emb)
            except Exception as e:
                print(f"[chat_history] embedding failed: {e}")

        # Map sources to jsonb format
        sources_list = [
            {"articleId": s.get("source", ""), "title": s.get("title", "")}
            for s in sources_raw
            if isinstance(s, dict)
        ]
        sources_json = json.dumps(sources_list)

        if emb_str:
            db.execute(
                text("""
                    INSERT INTO public.chat_history
                    (bu_id, user_id, question, answer, sources, question_embedding, created_at)
                    VALUES (:bu_id, :user_id, :question, :answer, CAST(:sources_json AS jsonb), CAST(:emb_str AS vector), now())
                """),
                {
                    "bu_id": bu_id,
                    "user_id": username,
                    "question": user_query,
                    "answer": bot_response,
                    "sources_json": sources_json,
                    "emb_str": emb_str,
                },
            )
        else:
            db.execute(
                text("""
                    INSERT INTO public.chat_history
                    (bu_id, user_id, question, answer, sources, created_at)
                    VALUES (:bu_id, :user_id, :question, :answer, CAST(:sources_json AS jsonb), now())
                """),
                {
                    "bu_id": bu_id,
                    "user_id": username,
                    "question": user_query,
                    "answer": bot_response,
                    "sources_json": sources_json,
                },
            )
        db.commit()
        print(f"[chat_history] Saved to DB (bu={bu}, user={username})")
        return True
    except Exception as e:
        db.rollback()
        print(f"[chat_history] Save failed: {e}")
        return False
    finally:
        db.close()


def save_chat_logs(data: dict) -> int:
    """Save Q&A to DB. Tries: 1) Go backend (if GO_BACKEND_URL set), 2) Direct DB insert."""
    ts = int(time.time())
    bu = data.get("bu", "carmen")
    username = data.get("username", "anonymous")
    user_query = (data.get("user_query") or "").strip()
    bot_response = (data.get("bot_response") or "").strip()
    sources_raw = data.get("sources") or []

    if not user_query or not bot_response:
        return ts

    print(f"[chat_history] Saving (bu={bu}, user={username}, q_len={len(user_query)})")

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
        req = urllib.request.Request(
            f"{go_url}/api/chat/record-history",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status in (200, 201):
                    return ts  # success
        except urllib.error.HTTPError as e:
            print(f"[chat_history] Go backend failed: {e.code}, using direct DB")
        except Exception as e:
            print(f"[chat_history] Go backend error: {e}, using direct DB")

    # 2) Fallback: save directly to DB (works when running carmen-chatbot standalone)
    if _save_to_db_direct(data):
        pass  # saved
    return ts

