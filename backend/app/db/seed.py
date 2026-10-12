import asyncio
from sqlalchemy import select
from backend.app.core.db import SessionLocal, engine
from backend.app.models.base import Base
from backend.app.models.user import User, Responder, UserRole, ResponderStatus

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
            name="Officer Karthik Subramanian",
            email="karthik@sentinel.gov",
            password_hash="$2b$12$A/RK0UnYiP4utLNO9gVI9OZ1V8t/dNC6lhfsXHLjAfZN.Zq8Oh4Gq",
            role=UserRole.RESPONDER
        )
        session.add_all([admin, dispatcher, responder_user])
        await session.flush()

        responder = Responder(
            user_id=responder_user.id,
            status=ResponderStatus.AVAILABLE,
            latitude=13.0604,
            longitude=80.2496,
            department="Traffic & Highway Rescue"
        )
        session.add(responder)
        await session.flush()

        # A realistic responder pool. The dashboard's unit counts are computed
        # from this table, and the k-d tree needs more than one point to be
        # doing any actual spatial work. This is seeded demo data - it is
        # disclosed as such, not presented as live operational figures.
        seeded_responders = [
            ("Officer Priya Nair", "priya@sentinel.gov", "Fire & Rescue", ResponderStatus.AVAILABLE, 13.0418, 80.2341),
            ("Officer Arun Kumar", "arun@sentinel.gov", "Fire & Rescue", ResponderStatus.BUSY, 13.0878, 80.2101),
            ("Officer Sangeetha R", "sangeetha@sentinel.gov", "Medical Response", ResponderStatus.AVAILABLE, 13.0732, 80.2609),
            ("Officer Vignesh Raja", "vignesh@sentinel.gov", "Medical Response", ResponderStatus.AVAILABLE, 13.0067, 80.2206),
            ("Officer Nandhini S", "nandhini@sentinel.gov", "Flood Response", ResponderStatus.BUSY, 12.9815, 80.2180),
            ("Officer Imran Basha", "imran@sentinel.gov", "Electrical Hazard", ResponderStatus.AVAILABLE, 13.0012, 80.2565),
            ("Officer Kaviya Murugan", "kaviya@sentinel.gov", "Traffic & Highway Rescue", ResponderStatus.OFFLINE, 12.9249, 80.1000),
            ("Officer Ramesh Pandian", "ramesh@sentinel.gov", "Structural Response", ResponderStatus.AVAILABLE, 13.0900, 80.2880),
            ("Officer Meera Iyer", "meera@sentinel.gov", "Medical Response", ResponderStatus.OFFLINE, 12.9010, 80.2279),
        ]
        for name, email, department, resp_status, lat, lon in seeded_responders:
            user = User(
                name=name,
                email=email,
                password_hash="$2b$12$A/RK0UnYiP4utLNO9gVI9OZ1V8t/dNC6lhfsXHLjAfZN.Zq8Oh4Gq",
                role=UserRole.RESPONDER,
            )
            session.add(user)
            await session.flush()
            session.add(Responder(
                user_id=user.id,
                status=resp_status,
                latitude=lat,
                longitude=lon,
                department=department,
            ))
        await session.flush()

        await session.commit()
        print("Database seeded with users and responders. Run backend.app.db.seed_demo for incidents.")

if __name__ == "__main__":
    asyncio.run(seed_data())
