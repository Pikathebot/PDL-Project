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

        # A realistic responder pool. The dashboard's unit counts are computed
        # from this table, and the k-d tree needs more than one point to be
        # doing any actual spatial work. This is seeded demo data - it is
        # disclosed as such, not presented as live operational figures.
        seeded_responders = [
            ("Officer Priya Nair", "priya@sentinel.gov", "Fire & Rescue", ResponderStatus.AVAILABLE, 19.1197, 72.8464),
            ("Officer Amit Deshmukh", "amit@sentinel.gov", "Fire & Rescue", ResponderStatus.BUSY, 19.0330, 72.8397),
            ("Officer Sana Qureshi", "sana@sentinel.gov", "Medical Response", ResponderStatus.AVAILABLE, 18.9750, 72.8258),
            ("Officer Vikram Rao", "vikram@sentinel.gov", "Medical Response", ResponderStatus.AVAILABLE, 19.0640, 72.8990),
            ("Officer Neha Joshi", "neha@sentinel.gov", "Flood Response", ResponderStatus.BUSY, 19.0176, 72.8562),
            ("Officer Imran Shaikh", "imran@sentinel.gov", "Electrical Hazard", ResponderStatus.AVAILABLE, 19.1075, 72.8263),
            ("Officer Kavita Menon", "kavita@sentinel.gov", "Traffic & Highway Rescue", ResponderStatus.OFFLINE, 19.2183, 72.9781),
            ("Officer Rohit Pawar", "rohit@sentinel.gov", "Structural Response", ResponderStatus.AVAILABLE, 18.9388, 72.8354),
            ("Officer Meera Iyer", "meera@sentinel.gov", "Medical Response", ResponderStatus.OFFLINE, 19.0896, 72.8656),
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
