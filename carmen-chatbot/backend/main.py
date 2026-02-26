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

from .core.config import FRONTEND_DIR, IMAGES_DIR, WIKI_DIR
from .api import chat_routes as chat

app = FastAPI(title="Carmen Chatbot System")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://10.190.239.14:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include Routers
app.include_router(chat.router)

# Static Files
if not IMAGES_DIR.exists(): os.makedirs(IMAGES_DIR)

@app.get("/images/{filename:path}")
async def get_image(filename: str):
    basename = os.path.basename(filename)
    
    if WIKI_DIR.exists():
        # 1. Try exact relative path first (e.g., ap/image-1.png)
        exact_path = WIKI_DIR / filename
        if exact_path.is_file():
            return FileResponse(exact_path)
            
        # 2. Fallback to searching by basename
        for path in WIKI_DIR.rglob(basename):
            if path.is_file():
                return FileResponse(path)
                
    # Fallback to local images
    local_path = IMAGES_DIR / basename
    if local_path.is_file():
        return FileResponse(local_path)
        
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