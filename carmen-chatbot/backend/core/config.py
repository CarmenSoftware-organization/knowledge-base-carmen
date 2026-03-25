import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory Setup
BASE_DIR = Path(__file__).resolve().parent.parent

# Project root
PROJECT_ROOT = BASE_DIR.parent.parent

# Chatbot Root (.env is here)
CHATBOT_ROOT = BASE_DIR.parent

# Load .env from chatbot root
load_dotenv(CHATBOT_ROOT / ".env")

class Settings:
    PROJECT_NAME: str = "Carmen Chatbot System"
    VERSION: str = "1.0.0"
    
    def __init__(self):
        # --- LLM Provider (OpenAI-compatible) ---
        self.LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
        _base = os.getenv("LLM_API_BASE", "https://openrouter.ai/api/v1").rstrip("/")
        self.LLM_API_BASE: str = _base if _base.endswith("/v1") else _base + "/api/v1"
        self.LLM_CHAT_MODEL: str = os.getenv("LLM_CHAT_MODEL", "stepfun/step-3.5-flash:free")
        self.LLM_INTENT_MODEL: str = os.getenv("LLM_INTENT_MODEL", "google/gemini-2.5-flash-lite")
        self.LLM_EMBED_MODEL: str = os.getenv("LLM_EMBED_MODEL", "qwen/qwen3-embedding-8b")

        # --- Database Settings ---
        self.DB_HOST: str = os.getenv("DB_HOST")
        self.DB_PORT: str = os.getenv("DB_PORT")
        self.DB_USER: str = os.getenv("DB_USER")
        self.DB_PASSWORD: str = os.getenv("DB_PASSWORD")
        self.DB_NAME: str = os.getenv("DB_NAME")
        self.DB_SSLMODE: str = os.getenv("DB_SSLMODE")
        
        self.DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
        self.DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        
        # --- App Settings ---
        self.RATE_LIMIT_PER_MINUTE: str = os.getenv("RATE_LIMIT_PER_MINUTE", "20/minute")
        cors_origins_str = os.getenv("CORS_ORIGINS", "*")
        self.CORS_ORIGINS = [origin.strip() for origin in cors_origins_str.split(",")] if cors_origins_str else ["*"]
        
        # --- Path Setup ---
        self.BASE_DIR: Path = BASE_DIR
        self.IMAGES_DIR: Path = BASE_DIR / "images"
        
        # Go backend URL for recording chat history to DB (optional)
        # When set, save_chat_logs will POST to /api/chat/record-history
        self.GO_BACKEND_URL: str = os.getenv("GO_BACKEND_URL", "").rstrip("/")

        # --- Privacy ---
        # HMAC secret used to hash user_id before storing/logging.
        # Set a strong random value in .env — defaults keep the system
        # functional but should be overridden in production.
        self.PRIVACY_HMAC_SECRET: str = os.getenv("PRIVACY_HMAC_SECRET", "carmen-privacy-default")

        # Read WIKI_DIR from env, fallback to PROJECT_ROOT/carmen_cloud
        wiki_path = os.getenv("WIKI_CONTENT_PATH", "")
        if wiki_path:
            wiki_resolved = Path(wiki_path)
            if not wiki_resolved.is_absolute():
                wiki_resolved = (CHATBOT_ROOT / wiki_resolved).resolve()
            self.WIKI_DIR: Path = wiki_resolved
        else:
            self.WIKI_DIR: Path = PROJECT_ROOT / "carmen_cloud"

        # --- Dynamic Configs ---
        self.PATH_RULES = self._load_config_file(BASE_DIR / "core" / "path_rules.yaml") or \
                          self._load_config_file(BASE_DIR / "core" / "path_rules.json") or []
        
        self.PROMPTS = self._load_config_file(BASE_DIR / "core" / "prompts.yaml") or \
                       self._load_config_file(BASE_DIR / "core" / "prompts.json") or {}

        # --- Vector Settings ---
        self.VECTOR_DIMENSION: int = int(os.getenv("VECTOR_DIMENSION", "1536"))

        # --- Daily Budget Cap ---
        # Max chat requests allowed per day across all users (0 = unlimited)
        self.DAILY_REQUEST_LIMIT: int = int(os.getenv("DAILY_REQUEST_LIMIT", "500"))

        # --- Image Index ---
        # How often (seconds) to rescan WIKI_DIR for new images (0 = disable periodic refresh)
        self.IMAGE_INDEX_REFRESH_SECONDS: int = int(os.getenv("IMAGE_INDEX_REFRESH_SECONDS", "300"))

        # --- LLM Reliability ---
        # Fallback model used when primary model fails before yielding content
        self.LLM_FALLBACK_MODEL: str = os.getenv("LLM_FALLBACK_MODEL", "")
        # Max tokens allowed for the full prompt (system + history + context + question).
        # For RAG customer support: system~700 + history~300 + context~2000 + question~150 ≈ 3,200 typical.
        # 6,000 gives comfortable headroom without risking model context overflow.
        self.MAX_PROMPT_TOKENS: int = int(os.getenv("MAX_PROMPT_TOKENS", "6000"))

    @property
    def DATABASE_URL(self) -> str:
        """Standard SQLAlchemy URL (Sync)."""
        return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?sslmode={self.DB_SSLMODE}"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        """SQLAlchemy URL optimized for asyncpg (Async)."""
        url = self.DATABASE_URL.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
        # asyncpg uses 'ssl' instead of 'sslmode'
        if "sslmode=" in url:
            url = url.replace("sslmode=disable", "ssl=disable")
            url = url.replace("sslmode=require", "ssl=require")
        return url

    def _load_config_file(self, path: Path):
        """Helper to load JSON or YAML config files."""
        if not path.exists():
            return None
        try:
            with open(path, 'r', encoding='utf-8') as f:
                if path.suffix.lower() in ['.yaml', '.yml']:
                    import yaml
                    return yaml.safe_load(f)
                import json
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Error loading config from {path}: {e}")
            return None

    @property
    def is_llm_ready(self) -> bool:
        return bool(self.LLM_API_KEY)

    @property
    def active_api_key(self) -> str:
        return self.LLM_API_KEY

    @property
    def active_api_base(self) -> str:
        return self.LLM_API_BASE

    @property
    def active_chat_model(self) -> str:
        return self.LLM_CHAT_MODEL

    @property
    def active_intent_model(self) -> str:
        return self.LLM_INTENT_MODEL

# Instantiate singleton
settings = Settings()

# Ensure necessary directories exist
settings.IMAGES_DIR.mkdir(parents=True, exist_ok=True)

if not settings.is_llm_ready:
    print("WARNING: LLM_API_KEY is missing in .env")
