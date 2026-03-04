import re
import time

# ==========================================
# 💬 CHAT HISTORY (Frontend-Only / Stateless)
# ==========================================

# Temporary per-request cache (populated from frontend history each request)
_request_history = {}


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


def save_chat_logs(data: dict) -> int:
    """No-op for stateless mode. Frontend handles persistence via localStorage."""
    return int(time.time())

