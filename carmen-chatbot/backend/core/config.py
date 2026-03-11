import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory Setup
BASE_DIR = Path(__file__).resolve().parent.parent

# Project root (localChromaDB + openrouter)
PROJECT_ROOT = BASE_DIR.parent.parent

# Chatbot Root (.env is here)
CHATBOT_ROOT = BASE_DIR.parent

# Load .env from chatbot root
load_dotenv(CHATBOT_ROOT / ".env")

class Settings:
    PROJECT_NAME: str = "Carmen Chatbot System"
    VERSION: str = "1.0.0"
    
    def __init__(self):
        self.OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
        self.ACTIVE_LLM_PROVIDER: str = os.getenv("ACTIVE_LLM_PROVIDER", "openrouter")
        self.OPENROUTER_CHAT_MODEL: str = os.getenv("OPENROUTER_CHAT_MODEL", "stepfun/step-3.5-flash:free")

        # Z.ai
        self.ZAI_API_KEY: str = os.getenv("ZAI_API_KEY", "")
        self.ZAI_API_BASE: str = os.getenv("ZAI_API_BASE", "https://api.z.ai/api/coding/paas/v4")
        self.ZAI_CHAT_MODEL: str = os.getenv("ZAI_CHAT_MODEL", "gpt-4o")

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
        
        # Database Connection Pooling Setting
        self.DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
        self.DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        
        # API Rate Limiting
        self.RATE_LIMIT_PER_MINUTE: str = os.getenv("RATE_LIMIT_PER_MINUTE", "20/minute")
        
        # Security / CORS Settings
        cors_origins_str = os.getenv("CORS_ORIGINS", "*")
        self.CORS_ORIGINS = [origin.strip() for origin in cors_origins_str.split(",")] if cors_origins_str else ["*"]
        self.FRONTEND_DIR: Path = BASE_DIR / "frontend"
        self.IMAGES_DIR: Path = BASE_DIR / "images"
        
        # Read WIKI_DIR from env, fallback to PROJECT_ROOT/carmen_cloud
        wiki_path = os.getenv("WIKI_CONTENT_PATH", "")
        if wiki_path:
            wiki_resolved = Path(wiki_path)
            if not wiki_resolved.is_absolute():
                wiki_resolved = (CHATBOT_ROOT / wiki_resolved).resolve()
            self.WIKI_DIR: Path = wiki_resolved
        else:
            self.WIKI_DIR: Path = PROJECT_ROOT / "carmen_cloud"

    @property
    def is_openrouter_api_ready(self) -> bool:
        return bool(self.OPENROUTER_API_KEY)

    @property
    def is_zai_api_ready(self) -> bool:
        return bool(self.ZAI_API_KEY)

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
DB_POOL_SIZE = settings.DB_POOL_SIZE
DB_MAX_OVERFLOW = settings.DB_MAX_OVERFLOW
CORS_ORIGINS = settings.CORS_ORIGINS
project_root = BASE_DIR

if not settings.is_openrouter_api_ready:
    print("⚠️ WARNING: OPENROUTER_API_KEY is missing in .env")
