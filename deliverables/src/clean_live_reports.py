"""Reset the demo after a live run-through, without re-running the AI seed.

Removes reports filed during the demo (anything not INC-DEMO*), puts the
duplicate-cluster fire report INC-DEMO002 back to VERIFIED/unassigned, and
restores every responder's seeded availability (a dispatch marks the
responder BUSY, and seed_demo --reset does not touch responders).

Cleans both databases run.bat can use: the SQLite file (standalone mode) and
the Docker Postgres (skipped with a note if the container isn't running).

Run from the repo root:  .venv\\Scripts\\python.exe deliverables\\src\\clean_live_reports.py
"""
import asyncio, os, sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

sys.path.insert(0, os.getcwd())
from backend.app.core.config import settings  # noqa: E402

SEEDED_STATUS = {
    "karthik@sentinel.gov": "AVAILABLE", "priya@sentinel.gov": "AVAILABLE", "arun@sentinel.gov": "BUSY",
    "sangeetha@sentinel.gov": "AVAILABLE", "vignesh@sentinel.gov": "AVAILABLE", "nandhini@sentinel.gov": "BUSY",
    "imran@sentinel.gov": "AVAILABLE", "kaviya@sentinel.gov": "OFFLINE", "ramesh@sentinel.gov": "AVAILABLE",
    "meera@sentinel.gov": "OFFLINE",
}
SQLITE_URL = "sqlite+aiosqlite:///./sentinel_dev.db"
POSTGRES_URL = (f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
                f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}")


async def clean(url, label):
    pg = url.startswith("postgresql")
    # Postgres stores status as native enums; SQLite as plain text.
    incident_status = "CAST('VERIFIED' AS incidentstatus)" if pg else "'VERIFIED'"
    responder_status = "CAST(:s AS responderstatus)" if pg else ":s"
    engine = create_async_engine(url)
    try:
        async with engine.begin() as c:
            ids = [r[0] for r in await c.execute(text("select id from incidents where tracking_id not like 'INC-DEMO%'"))]
            for i in ids:
                await c.execute(text("delete from media_attachments where incident_id=:i"), {"i": i})
                await c.execute(text("delete from incidents where id=:i"), {"i": i})
            # A live report may have joined a demo cluster: recount members, drop clusters left empty.
            await c.execute(text("update incident_clusters set corroboration_count="
                                 "(select count(*) from incidents where incidents.cluster_id=incident_clusters.id)"))
            await c.execute(text("delete from incident_clusters where corroboration_count=0"))
            await c.execute(text(f"update incidents set status={incident_status}, assigned_responder_id=NULL, "
                                 "dispatched_at=NULL where tracking_id='INC-DEMO002'"))
            for email, status in SEEDED_STATUS.items():
                await c.execute(text(f"update responders set status={responder_status} "
                                     "where user_id=(select id from users where email=:e)"), {"s": status, "e": email})
        print(f"{label}: removed {len(ids)} live report(s); INC-DEMO002 and responder statuses restored")
    except (OSError, ConnectionError) as e:
        print(f"{label}: skipped, not reachable ({e.__class__.__name__})")
    finally:
        await engine.dispose()


async def main():
    if os.path.exists("sentinel_dev.db"):
        await clean(SQLITE_URL, "SQLite")
    await clean(POSTGRES_URL, "Postgres")

asyncio.run(main())
