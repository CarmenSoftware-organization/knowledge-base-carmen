import uvicorn
import os
import asyncio

from .core.logging_config import setup_logging, log_startup
setup_logging()

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
from pathlib import Path
from functools import lru_cache

from slowapi.errors import RateLimitExceeded

from .core.rate_limit import limiter

from .core.config import settings
from .llm.pricing import sync_pricing_from_openrouter
from .core.database import AsyncSessionLocal
from .api import chat_routes as chat
from .llm.intent_router import intent_router
from urllib.parse import urlparse
from sqlalchemy import text


def _origin_allowed(source: str, allowed_origins: list[str]) -> bool:
    """Compare netloc of request origin against allowed origins list."""
    try:
        source_host = urlparse(source).netloc
        for allowed in allowed_origins:
            if urlparse(allowed).netloc == source_host:
                return True
    except Exception:
        pass
    return False

IMAGE_INDEX = {}
_image_index_lock = asyncio.Lock()

async def build_image_index():
    """Scan all images in WIKI_DIR and cache their paths (non-blocking)."""
    if _image_index_lock.locked():
        return  # Skip if already building

    async with _image_index_lock:
        def _scan():
            new_index = {}
            if settings.WIKI_DIR.exists():
                for path in settings.WIKI_DIR.rglob("*"):
                    if path.is_file() and path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']:
                        new_index[path.name] = path
            return new_index

        new_index = await asyncio.to_thread(_scan)
        IMAGE_INDEX.clear()
        IMAGE_INDEX.update(new_index)
        print(f"✅ Image Index Built: {len(IMAGE_INDEX)} images found.")

async def _image_index_refresh_loop():
    """Periodically rebuild IMAGE_INDEX and clear the lru_cache."""
    interval = settings.IMAGE_INDEX_REFRESH_SECONDS
    while True:
        await asyncio.sleep(interval)
        await build_image_index()
        find_image_path.cache_clear()


_PRICING_SYNC_INTERVAL = 86400  # 24 ชั่วโมง


async def _background_pricing_sync():
    """Run first OpenRouter pricing sync without blocking app startup (PaaS port/health probes)."""
    await sync_pricing_from_openrouter()


async def _pricing_sync_loop():
    """Re-sync OpenRouter pricing every 24 hours while server is running."""
    while True:
        await asyncio.sleep(_PRICING_SYNC_INTERVAL)
        await sync_pricing_from_openrouter()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    log_startup(
        chat_model=settings.active_chat_model,
        intent_model=settings.active_intent_model,
        embed_model=settings.LLM_EMBED_MODEL,
        api_base=settings.LLM_API_BASE,
    )
    await build_image_index()
    await intent_router.async_init()
    # Pricing sync touches OpenRouter + hundreds of DB upserts — do not block bind/health checks (Render, etc.).
    asyncio.create_task(_background_pricing_sync())
    asyncio.create_task(_pricing_sync_loop())
    if settings.IMAGE_INDEX_REFRESH_SECONDS > 0:
        asyncio.create_task(_image_index_refresh_loop())
    yield

app = FastAPI(title="Carmen Chatbot System", lifespan=lifespan)

from slowapi.middleware import SlowAPIMiddleware

# Initialize Rate Limiter
app.state.limiter = limiter
# Some versions of slowapi require explicit init_app or it might not bind to routers correctly
if hasattr(limiter, "init_app"):
    limiter.init_app(app)
app.add_middleware(SlowAPIMiddleware)

@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for RateLimitExceeded to provide a clearer user message."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too Many Requests. Please slow down.",
            "error_code": "RATE_LIMIT_EXCEEDED",
            "message": "You have exceeded the rate limit. Please try again in a moment."
        },
        headers={"Retry-After": str(exc.detail)}
    )

# CORS - Hardened for Production readiness
cors_origins = settings.CORS_ORIGINS
# Security Warning: If Origins is *, allow_credentials must be False to be standard-compliant in some cases
# but more importantly, it should be restricted to known domains.
is_wildcard = "*" in cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=not is_wildcard, # Safer default: disable credentials on wildcard
    allow_methods=["*"],
    allow_headers=["*"]
)

# ==========================================
# 🛡️ ORIGIN VALIDATION MIDDLEWARE
# Blocks /api/chat requests from unknown origins
# when specific domains are configured in CORS_ORIGINS.
# If CORS_ORIGINS = ["*"], validation is skipped.
# ==========================================
@app.middleware("http")
async def origin_validation_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/chat"):
        allowed = settings.CORS_ORIGINS
        if "*" not in allowed:
            origin = request.headers.get("origin", "")
            referer = request.headers.get("referer", "")
            source = origin or referer
            # Only reject when a source header is present but doesn't match.
            # Missing Origin/Referer = same-origin page request → allow.
            if source and not _origin_allowed(source, allowed):
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Request origin not allowed."}
                )
    return await call_next(request)

# Include Routers
app.include_router(chat.router)

# Health Check Route
@app.get("/api/health")
@limiter.limit("20/minute")
async def health_check(request: Request):
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Health check DB error: %s", e)
        return JSONResponse(status_code=503, content={"status": "error", "db": "unavailable"})

# Static Files
if not settings.IMAGES_DIR.exists(): os.makedirs(settings.IMAGES_DIR)

# Pre-resolve base directories once at module load time for path jail checks
_WIKI_DIR_RESOLVED = settings.WIKI_DIR.resolve()
_IMAGES_DIR_RESOLVED = settings.IMAGES_DIR.resolve()

# ⚡ Caching Image Paths to prevent recursive IO bottlenecks in Production ⚡
@lru_cache(maxsize=1024)
def find_image_path(filename: str) -> Path | None:
    # Support paths that might still have carmen_cloud/ prepended and normalize slashes
    clean_filename = filename.replace("\\", "/")
    if clean_filename.startswith("carmen_cloud/"):
        clean_filename = clean_filename[len("carmen_cloud/"):]

    if settings.WIKI_DIR.exists():
        # First check the exact relative path in WIKI_DIR
        exact_path = settings.WIKI_DIR / clean_filename
        if exact_path.is_file():
            # 🛡️ Path jail: ensure resolved path stays inside WIKI_DIR
            try:
                exact_path.resolve().relative_to(_WIKI_DIR_RESOLVED)
                return exact_path
            except ValueError:
                import logging
                logging.getLogger(__name__).warning(
                    "Path traversal attempt blocked: %s (resolved outside WIKI_DIR)", filename
                )
                return None

        # Fallback to searching by basename in cache (Instant lookup)
        basename = os.path.basename(clean_filename)
        if basename in IMAGE_INDEX:
            return IMAGE_INDEX[basename]

    # Fallback to local images folder (basename strips any directory component)
    basename = os.path.basename(clean_filename)
    local_path = settings.IMAGES_DIR / basename
    if local_path.is_file():
        return local_path

    return None

@app.get("/images/{filename:path}")
@limiter.limit(settings.RATE_LIMIT_PER_MINUTE)
async def get_image(filename: str, request: Request):
    # ⚡ Pass the full filename (path) to find_image_path instead of just the basename
    # ⚡ Use LRU Cache to find the resolved path instantly
    resolved_path = find_image_path(filename)
    
    if resolved_path:
        # Add cache-control headers to prevent browser from serving stale images
        # This fixes issues where old code cached wrong images for generic filenames like image-12.png
        response = FileResponse(resolved_path)
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
        return response
        
    raise HTTPException(status_code=404, detail="Image not found")

# Specific Pages serving using Templates


if __name__ == "__main__":
    print("🚀 Starting Carmen Server (Template Version)...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)