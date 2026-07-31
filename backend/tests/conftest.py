import asyncio
from typing import AsyncGenerator, Generator
import pytest
from httpx import AsyncClient, ASGIVoid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.app.core.config import settings
from backend.app.core.db import get_db
from backend.app.models.base import Base
from backend.app.main import app

# Create independent test database URL
TEST_SQLALCHEMY_DATABASE_URI = f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}_test"

test_engine = create_async_engine(TEST_SQLALCHEMY_DATABASE_URI, future=True)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def init_test_db():
    # Setup: Create tables in test DB
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Teardown: Clean tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()

@pytest.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    # Override get_db dependency
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        app=app, 
        base_url="http://testserver"
    ) as ac:
        yield ac
        
    app.dependency_overrides.clear()
