"""Async SQLAlchemy engine factory and session management."""

from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from shared.config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, pool_size=5, max_overflow=10, echo=False)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


@asynccontextmanager
async def get_session():
    """Yield an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db():
    """FastAPI dependency that provides a database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create all tables. Call on service startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
