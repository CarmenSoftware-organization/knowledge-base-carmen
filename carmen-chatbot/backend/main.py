import uvicorn
import os

from .core.logging_config import setup_logging
setup_logging()

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates
from contextlib import asynccontextmanager
from pathlib import Path
from functools import lru_cache

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .core.rate_limit import limiter

from .core.config import settings
from .api import chat_routes as chat

IMAGE_INDEX = {}

def build_image_index():
    """Scan all images in WIKI_DIR at startup and cache their paths."""
    print("📸 Building Image Index Cache...")
    if settings.WIKI_DIR.exists():
        for path in settings.WIKI_DIR.rglob("*"):
            if path.is_file() and path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']:
                IMAGE_INDEX[path.name] = path
    print(f"✅ Image Index Built: {len(IMAGE_INDEX)} images found.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    build_image_index()
    yield
    # Shutdown actions
    pass

app = FastAPI(title="Carmen Chatbot System", lifespan=lifespan)

# Initialize Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include Routers
app.include_router(chat.router)

# Health Check Route
@app.get("/api/health")
@limiter.limit("20/minute")
async def health_check(request: Request):
    return {"status": "ok"}

# Static Files
if not settings.IMAGES_DIR.exists(): os.makedirs(settings.IMAGES_DIR)

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
            return exact_path
            
        # Fallback to searching by basename in cache (Instant lookup)
        basename = os.path.basename(clean_filename)
        if basename in IMAGE_INDEX:
            return IMAGE_INDEX[basename]
                
    # Fallback to local images folder
    basename = os.path.basename(clean_filename)
    local_path = settings.IMAGES_DIR / basename
    if local_path.is_file():
        return local_path
        
    return None

@app.get("/images/{filename:path}")
async def get_image(filename: str):
    # ⚡ Pass the full filename (path) to find_image_path instead of just the basename
    # ⚡ Use LRU Cache to find the resolved path instantly
    resolved_path = find_image_path(filename)
    
    if resolved_path:
        # Add cache-control headers to prevent browser from serving stale images
        # This fixes issues where old code cached wrong images for generic filenames like image-12.png
        response = FileResponse(resolved_path)
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
        response.headers["X-Resolved-From"] = str(resolved_path)  # Debug: trace which file was served
        return response
        
    raise HTTPException(status_code=404, detail="Image not found")

# Specific Pages serving using Templates


if __name__ == "__main__":
    print("🚀 Starting Carmen Server (Template Version)...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)