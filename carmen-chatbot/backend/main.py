import uvicorn
import os
import sys

# Patch for ChromaDB/SQLite on some systems
try:
    __import__('pysqlite3')
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ImportError: pass

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path
from functools import lru_cache

from .core.config import FRONTEND_DIR, IMAGES_DIR, WIKI_DIR, CORS_ORIGINS
from .api import chat_routes as chat

app = FastAPI(title="Carmen Chatbot System")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include Routers
app.include_router(chat.router)

# Health Check Route
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Static Files
if not IMAGES_DIR.exists(): os.makedirs(IMAGES_DIR)

# ⚡ Caching Image Paths to prevent recursive IO bottlenecks in Production ⚡
@lru_cache(maxsize=1024)
def find_image_path(filename: str) -> Path | None:
    # Support paths that might still have carmen_cloud/ prepended and normalize slashes
    clean_filename = filename.replace("\\", "/")
    if clean_filename.startswith("carmen_cloud/"):
        clean_filename = clean_filename[len("carmen_cloud/"):]
        
    if WIKI_DIR.exists():
        # First check the exact relative path in WIKI_DIR
        exact_path = WIKI_DIR / clean_filename
        if exact_path.is_file():
            return exact_path
            
        # Fallback to searching by basename recursively (if the path is broken/missing)
        basename = os.path.basename(clean_filename)
        for path in WIKI_DIR.rglob(basename):
            if path.is_file():
                return path
                
    # Fallback to local images folder
    basename = os.path.basename(clean_filename)
    local_path = IMAGES_DIR / basename
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

# Serve carmen-widget.js and other frontend assets as static
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

# Helper to serve carmen-widget.js directly if needed by legacy relative paths
@app.get("/carmen-widget.js")
async def widget_js(): return FileResponse(FRONTEND_DIR / 'carmen-widget.js')

# Specific Pages serving using Templates


if __name__ == "__main__":
    print("🚀 Starting Carmen Server (Template Version)...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)