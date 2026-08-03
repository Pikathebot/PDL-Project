import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select
from backend.app.core.db import SessionLocal, engine
from backend.app.models.base import Base
from backend.app.models.user import User, Responder, UserRole, ResponderStatus
from backend.app.models.incident import Incident, IncidentCluster, IncidentCategory, IncidentStatus

async def seed_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        # Check existing
        res = await session.execute(select(User))
        if res.scalars().first():
            print("Database already seeded.")
            return

        # Users
        admin = User(
            name="Admin User",
            email="admin@sentinel.gov",
            password_hash="$2b$12$A/RK0UnYiP4utLNO9gVI9OZ1V8t/dNC6lhfsXHLjAfZN.Zq8Oh4Gq",  # admin123
            role=UserRole.ADMIN
        )
        dispatcher = User(
            name="Control Dispatcher 1",
            email="dispatcher@sentinel.gov",
            password_hash="$2b$12$A/RK0UnYiP4utLNO9gVI9OZ1V8t/dNC6lhfsXHLjAfZN.Zq8Oh4Gq",
            role=UserRole.DISPATCHER
        )
        responder_user = User(
            name="Officer Rahul Sharma",
            email="rahul@sentinel.gov",
            password_hash="$2b$12$A/RK0UnYiP4utLNO9gVI9OZ1V8t/dNC6lhfsXHLjAfZN.Zq8Oh4Gq",
            role=UserRole.RESPONDER
        )
        session.add_all([admin, dispatcher, responder_user])
        await session.flush()

        responder = Responder(
            user_id=responder_user.id,
            status=ResponderStatus.AVAILABLE,
            latitude=19.0760,
            longitude=72.8777,
            department="Traffic & Highway Rescue"
        )
        session.add(responder)
        await session.flush()

        # Incident Cluster
        cluster = IncidentCluster(
            cluster_code="CLUST-2026-001",
            corroboration_count=2,
            merged_severity=4
        )
        session.add(cluster)
        await session.flush()

        # Incidents
        inc1 = Incident(
            tracking_id=f"INC-{uuid.uuid4().hex[:8].upper()}",
            category=IncidentCategory.ROAD_ACCIDENT,
            description="Two-vehicle collision near Marine Drive flyover block. Smoke visible.",
            phone_number="+919876543210",
            latitude=18.9440,
            longitude=72.8230,
            location_name="Marine Drive, Mumbai",
            severity=4,
            priority_score=85.5,
            status=IncidentStatus.VERIFIED,
            cluster_id=cluster.id,
            assigned_responder_id=responder.id
        )
        inc2 = Incident(
            tracking_id=f"INC-{uuid.uuid4().hex[:8].upper()}",
            category=IncidentCategory.FLOODING,
            description="Deep waterlogging near Hindmata underpass blocking traffic movement.",
            phone_number="+919876543211",
            latitude=19.0110,
            longitude=72.8420,
            location_name="Dadar Hindmata, Mumbai",
            severity=3,
            priority_score=62.0,
            status=IncidentStatus.REPORTED
        )
        session.add_all([inc1, inc2])
        await session.commit()
        print("Database seeded successfully with initial users, responders, and incidents.")

if __name__ == "__main__":
    asyncio.run(seed_data())
