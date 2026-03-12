from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL, DB_POOL_SIZE, DB_MAX_OVERFLOW

import os
db_host = os.getenv("DB_HOST", "Unknown")
db_name = os.getenv("DB_NAME", "Unknown")
print(f"Connecting to Database: {db_name} @ {db_host}")

engine = create_async_engine(
    settings.ASYNC_DATABASE_URL, 
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW
)
AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

Base = declarative_base()