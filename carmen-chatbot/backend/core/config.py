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
        self.OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
        self.ACTIVE_LLM_PROVIDER: str = os.getenv("ACTIVE_LLM_PROVIDER", "openrouter")
        self.OPENROUTER_CHAT_MODEL: str = os.getenv("OPENROUTER_CHAT_MODEL", "stepfun/step-3.5-flash:free")

        # Ollama
        self.OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.OLLAMA_EMBED_MODEL: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text:latest")
        self.OLLAMA_CHAT_MODEL: str = os.getenv("OLLAMA_CHAT_MODEL", "gemma3:1b")
        
        # PostgreSQL Database from root .env
        db_host = os.getenv("DB_HOST", "")
        db_port = os.getenv("DB_PORT", "")
        db_user = os.getenv("DB_USER", "")
        db_password = os.getenv("DB_PASSWORD", "")
        db_name = os.getenv("DB_NAME", "")
        db_sslmode = os.getenv("DB_SSLMODE", "")
        
        self.DATABASE_URL: str = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}?sslmode={db_sslmode}"
        
        # Static Assets
        self.FRONTEND_DIR: Path = BASE_DIR / "frontend"
        self.IMAGES_DIR: Path = BASE_DIR / "images"
        self.WIKI_DIR: Path = PROJECT_ROOT / "carmen_cloud"

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
OPENROUTER_API_KEY = settings.OPENROUTER_API_KEY
DATABASE_URL = settings.DATABASE_URL
project_root = BASE_DIR

if not settings.is_openrouter_api_ready:
    print("⚠️ WARNING: OPENROUTER_API_KEY is missing in .env")
