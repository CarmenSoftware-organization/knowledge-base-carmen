import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory Setup
BASE_DIR = Path(__file__).resolve().parent.parent

# Project root (localChromaDB + openrouter)
PROJECT_ROOT = BASE_DIR.parent.parent

# Load .env from project root (single source of truth)
load_dotenv(PROJECT_ROOT / ".env")

class Settings:
    PROJECT_NAME: str = "Carmen Chatbot System"
    VERSION: str = "1.0.0"
    
    def __init__(self):
        self.GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
        self.OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

        # Ollama
        self.OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.OLLAMA_EMBED_MODEL: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text:latest")
        self.OLLAMA_CHAT_MODEL: str = os.getenv("OLLAMA_CHAT_MODEL", "gemma3:1b")
        
        # PostgreSQL Database from root .env
        pg_host = os.getenv("PG_HOST", "dev.blueledgers.com")
        pg_port = os.getenv("PG_PORT", "6432")
        pg_user = os.getenv("PG_USER", "developer")
        pg_password = os.getenv("PG_PASSWORD", "123456")
        pg_name = os.getenv("PG_NAME", "ai")
        pg_sslmode = os.getenv("PG_SSLMODE", "require")
        
        self.DATABASE_URL: str = f"postgresql+psycopg2://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_name}?sslmode={pg_sslmode}"
        
        # Static Assets
        self.FRONTEND_DIR: Path = BASE_DIR / "frontend"
        self.IMAGES_DIR: Path = BASE_DIR / "images"
        self.WIKI_DIR: Path = PROJECT_ROOT / "carmen_cloud"

    @property
    def is_google_api_ready(self) -> bool:
        return bool(self.GOOGLE_API_KEY)

    @property
    def is_openrouter_api_ready(self) -> bool:
        return bool(self.OPENROUTER_API_KEY)

# Instantiate settings singleton
settings = Settings()

# Ensure directories exist
settings.IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# Compatibility aliases
FRONTEND_DIR = settings.FRONTEND_DIR
IMAGES_DIR = settings.IMAGES_DIR
WIKI_DIR = settings.WIKI_DIR
GOOGLE_API_KEY = settings.GOOGLE_API_KEY
OPENROUTER_API_KEY = settings.OPENROUTER_API_KEY
DATABASE_URL = settings.DATABASE_URL
project_root = BASE_DIR

if not settings.is_google_api_ready:
    print("⚠️ WARNING: GOOGLE_API_KEY is missing in .env")
if not settings.is_openrouter_api_ready:
    print("⚠️ WARNING: OPENROUTER_API_KEY is missing in .env")
