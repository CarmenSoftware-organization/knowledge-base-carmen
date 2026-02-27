from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL, DB_POOL_SIZE, DB_MAX_OVERFLOW

import os
db_host = os.getenv("DB_HOST", "Unknown")
db_name = os.getenv("DB_NAME", "Unknown")
print(f"🗄️ Connecting to Database: {db_name} @ {db_host}")

engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True,
    pool_size=DB_POOL_SIZE,
    max_overflow=DB_MAX_OVERFLOW
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()