from slowapi import Limiter
from fastapi import Request
from .config import settings

def get_real_ip(request: Request) -> str:
    """
    EXTREME SECURITY: Detects and pools suspicious header-based spoofing attempts.
    """
    socket_ip = request.client.host if request.client else "unknown"
    xff = request.headers.get("x-forwarded-for")
    
    if xff:
        if "127.0.0.1" in xff or "192.168." in xff or "10.0.0." in xff:
            return "internal_spoof_bucket"

    return socket_ip

# Global default limits provide a fallback if decorators on APIRouter Fail.
limiter = Limiter(
    key_func=get_real_ip, 
    storage_uri="memory://",
    default_limits=[settings.RATE_LIMIT_PER_MINUTE]
)
