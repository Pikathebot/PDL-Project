from typing import AsyncGenerator
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from backend.app.core.db import get_db
from backend.app.models.base import Base
from backend.app.main import app

# Self-contained in-memory SQLite database so tests run without Postgres.
test_engine = create_async_engine(
    "sqlite+aiosqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    future=True,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

@pytest.fixture(autouse=True)
def _no_celery_broker(monkeypatch):
    """
    Stop Celery from trying to reach a real Redis broker during tests.

    create_incident fires process_incident_ai.delay() and swallows the failure,
    but Celery still spends its full connection-retry budget first - which is
    where nearly all of the suite's wall-clock time was going.
    """
    from backend.app.tasks import ai_tasks
    monkeypatch.setattr(ai_tasks.process_incident_ai, "delay", lambda *a, **kw: None)


@pytest.fixture(autouse=True)
async def _setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield

@pytest.fixture
async def db(_setup_db) -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def dispatcher(db: AsyncSession):
    """A real dispatcher row; tests log in as this user with a real JWT."""
    from backend.app.core.auth import hash_password
    from backend.app.models.user import User, UserRole
    user = User(name="Test Dispatcher", email="dispatcher@test.local",
                password_hash=hash_password("dispatch123"), role=UserRole.DISPATCHER)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def anon_client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Unauthenticated client - for the citizen endpoints and for proving guards."""
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def client(anon_client: AsyncClient, dispatcher) -> AsyncGenerator[AsyncClient, None]:
    """
    Authenticated as a dispatcher with a real signed JWT, so every guarded
    endpoint is exercised through the actual bearer-token path rather than a
    dependency override. test_auth.py covers /auth/login itself.
    """
    from backend.app.core.auth import create_access_token
    anon_client.headers["Authorization"] = f"Bearer {create_access_token(dispatcher)}"
    yield anon_client
