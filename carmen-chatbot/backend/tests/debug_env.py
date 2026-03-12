import os
from dotenv import load_dotenv
from pathlib import Path

# Fix path for Carmen
BASE_DIR = Path(__file__).resolve().parent.parent
CHATBOT_ROOT = BASE_DIR.parent
load_dotenv(CHATBOT_ROOT / ".env")

db_host = os.getenv("DB_HOST", "NOT_FOUND")
db_name = os.getenv("DB_NAME", "NOT_FOUND")
db_user = os.getenv("DB_USER", "NOT_FOUND")

print(f"DEBUG: Host={db_host}, DB={db_name}, User={db_user}")

try:
    import psycopg
    print("✅ psycopg v3 is installed.")
except ImportError:
    print("❌ psycopg v3 is NOT installed.")

try:
    import asyncpg
    print("✅ asyncpg is installed.")
except ImportError:
    print("❌ asyncpg is NOT installed.")
