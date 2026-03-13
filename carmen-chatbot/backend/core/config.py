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
        # --- LLM Providers ---
        self.OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
        self.ACTIVE_LLM_PROVIDER: str = os.getenv("ACTIVE_LLM_PROVIDER", "openrouter")
        self.OPENROUTER_CHAT_MODEL: str = os.getenv("OPENROUTER_CHAT_MODEL", "stepfun/step-3.5-flash:free")

        self.ZAI_API_KEY: str = os.getenv("ZAI_API_KEY", "")
        self.ZAI_API_BASE: str = os.getenv("ZAI_API_BASE", "https://api.z.ai/api/coding/paas/v4")
        self.ZAI_CHAT_MODEL: str = os.getenv("ZAI_CHAT_MODEL", "gpt-4o")

        self.OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.OLLAMA_EMBED_MODEL: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text:latest")
        self.OLLAMA_CHAT_MODEL: str = os.getenv("OLLAMA_CHAT_MODEL", "gemma3:1b")
        
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
        self.FRONTEND_DIR: Path = BASE_DIR / "frontend"
        self.IMAGES_DIR: Path = BASE_DIR / "images"
        
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
    def is_openrouter_api_ready(self) -> bool:
        return bool(self.OPENROUTER_API_KEY)

    @property
    def is_zai_api_ready(self) -> bool:
        return bool(self.ZAI_API_KEY)

# Instantiate singleton
settings = Settings()

# Ensure necessary directories exist
settings.IMAGES_DIR.mkdir(parents=True, exist_ok=True)

if not settings.is_openrouter_api_ready:
    print("WARNING: OPENROUTER_API_KEY is missing in .env")
