from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from .config import settings

import logging
logger = logging.getLogger(__name__)

logger.info(f"Connecting to Database: {settings.DB_NAME} @ {settings.DB_HOST}")

engine = create_async_engine(
    settings.ASYNC_DATABASE_URL, 
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW
)
AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

Base = declarative_base()