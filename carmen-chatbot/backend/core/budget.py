import asyncio
from datetime import timezone, datetime

# ==========================================
# 📊 DAILY API BUDGET CAP (In-Memory)
# Resets automatically at midnight.
# Single-worker safe — uses asyncio.Lock.
# ==========================================

_state: dict = {"date": None, "count": 0}
_lock = asyncio.Lock()


async def check_and_increment(daily_limit: int) -> bool:
    """Check daily limit and increment counter if allowed.

    Returns True if the request is allowed, False if limit exceeded.
    Setting daily_limit=0 disables the cap (unlimited).
    """
    if daily_limit <= 0:
        return True

    async with _lock:
        today = datetime.now(timezone.utc).date().isoformat()
        if _state["date"] != today:
            _state["date"] = today
            _state["count"] = 0

        if _state["count"] >= daily_limit:
            return False

        _state["count"] += 1
        return True


def today_count() -> int:
    """Return how many requests have been served today."""
    return _state.get("count", 0)
