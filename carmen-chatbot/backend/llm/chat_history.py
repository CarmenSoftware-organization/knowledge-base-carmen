import re
import time

# ==========================================
# 💬 CHAT HISTORY (In-Memory Storage)
# ==========================================
# จัดการ chat history ทั้งหมดอยู่ที่ไฟล์นี้
# ถ้าอนาคตจะเปลี่ยนเป็น PostgreSQL → แก้ไฟล์นี้ไฟล์เดียว

_in_memory_history = {}


def clean_for_history(text: str, max_len: int = 200) -> str:
    """Strip images, HTML, videos from text before storing in chat history."""
    t = text
    # Remove markdown images ![alt](path)
    t = re.sub(r'!\[[^\]]*\]\([^)]+\)', '', t)
    # Remove HTML tags
    t = re.sub(r'<[^>]+>', '', t)
    # Remove YouTube URLs
    t = re.sub(r'https?://(?:www\.)?(?:youtube\.com|youtu\.be)/\S+', '', t)
    # Collapse whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    # Truncate
    if len(t) > max_len:
        t = t[:max_len] + '...'
    return t


def get_history_text(room_id: str, limit: int = 4) -> str:
    """Get formatted chat history text for prompt injection."""
    if room_id not in _in_memory_history:
        return "(ไม่มีบทสนทนาก่อนหน้า)"
    history = _in_memory_history[room_id][-limit:]
    if not history:
        return "(ไม่มีบทสนทนาก่อนหน้า)"
    lines = []
    pair_num = 0
    for h in history:
        if h['sender'] == 'user':
            pair_num += 1
            lines.append(f"[{pair_num}] ผู้ใช้: {h['message']}")
        else:
            lines.append(f"[{pair_num}] Carmen: {h['message']}")
    return "\n".join(lines)


def has_history(room_id: str) -> bool:
    """Check if a room has any chat history."""
    return room_id in _in_memory_history and len(_in_memory_history[room_id]) > 0


def clear_history(room_id: str):
    """Clear chat history for a specific room."""
    if room_id in _in_memory_history:
        del _in_memory_history[room_id]


def restore_history(room_id: str, frontend_history: list[dict] = None):
    """Restore chat history from frontend localStorage if in-memory is empty."""
    if not frontend_history:
        return
        
    if room_id not in _in_memory_history or len(_in_memory_history[room_id]) == 0:
        _in_memory_history[room_id] = []
        for msg in frontend_history:
            sender = msg.get("sender", "user")
            # For restored messages we'll use a dummy timestamp since we only care about the text context
            _in_memory_history[room_id].append({
                "sender": sender,
                "message": clean_for_history(msg.get("message", "")),
                "timestamp": msg.get("timestamp", "")
            })
            
        # Keep max 50 messages per room
        if len(_in_memory_history[room_id]) > 50:
            _in_memory_history[room_id] = _in_memory_history[room_id][-50:]
            
        print(f"🔄 Restored {len(_in_memory_history[room_id])} messages from frontend history for room {room_id}")


def save_chat_logs(data: dict) -> int:
    """Save user query and bot response to in-memory history."""
    room_id = data['room_id']
    if room_id not in _in_memory_history:
        _in_memory_history[room_id] = []
    # Store user message as-is, but clean bot response to keep history compact
    _in_memory_history[room_id].append({
        "sender": "user",
        "message": data['user_query'],
        "timestamp": data['timestamp']
    })
    clean_bot = clean_for_history(data['bot_response'])
    _in_memory_history[room_id].append({
        "sender": "bot",
        "message": clean_bot,
        "timestamp": data['timestamp']
    })
    # Keep max 50 messages per room
    if len(_in_memory_history[room_id]) > 50:
        _in_memory_history[room_id] = _in_memory_history[room_id][-50:]
    return int(time.time())
