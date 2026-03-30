"""Utility functions for core application functionality."""

def parse_device_type(user_agent: str) -> str:
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
