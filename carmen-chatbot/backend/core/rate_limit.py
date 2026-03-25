from slowapi import Limiter
from fastapi import Request
from .config import settings

def get_real_ip(request: Request) -> str:
    """Extract the real client IP, trusting only the rightmost public IP in X-Forwarded-For.

    Nginx appends the socket IP as the rightmost entry, so we take the last entry
    that is NOT a private/loopback address. Falls back to socket IP if none found.
    """
    socket_ip = request.client.host if request.client else "unknown"
    xff = request.headers.get("x-forwarded-for")

    if xff:
        # Walk right-to-left; skip private/loopback addresses added by internal hops
        _PRIVATE_PREFIXES = ("127.", "10.", "192.168.", "172.16.", "172.17.",
                             "172.18.", "172.19.", "172.20.", "172.21.", "172.22.",
                             "172.23.", "172.24.", "172.25.", "172.26.", "172.27.",
                             "172.28.", "172.29.", "172.30.", "172.31.", "::1", "fc", "fd")
        for candidate in reversed([ip.strip() for ip in xff.split(",")]):
            if not any(candidate.startswith(p) for p in _PRIVATE_PREFIXES):
                return candidate

    return socket_ip

# Global default limits provide a fallback if decorators on APIRouter Fail.
limiter = Limiter(
    key_func=get_real_ip, 
    storage_uri="memory://",
    default_limits=[settings.RATE_LIMIT_PER_MINUTE]
)
