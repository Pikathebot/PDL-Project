from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from backend.app.core.config import settings

_engine_kwargs = {}
if settings.SQLALCHEMY_DATABASE_URI.startswith("sqlite"):
    # aiosqlite connections are bound to the thread that opened them; the API
    # and an inline background task share one loop, so this is safe.
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    # Every statement was logged, incident descriptions and reporter phone
    # numbers included. Off by default now; set SQL_ECHO=true to debug.
    echo=settings.SQL_ECHO,
    future=True,
    **_engine_kwargs,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
