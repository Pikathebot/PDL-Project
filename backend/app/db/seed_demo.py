"""
Seed a realistic showcase dataset: ~18 Mumbai incidents from the last two
hours, three of which are deliberate duplicate groups so Union-Find clustering
visibly merges them, then push every one through the real AI pipeline and
leave the queue in a believable mix of statuses.

    python -m backend.app.db.seed_demo            # seed + process
    python -m backend.app.db.seed_demo --no-process
    python -m backend.app.db.seed_demo --reset    # wipe incidents first

Runs seed_data() first so responders exist. Idempotent: skips if any demo
incident is already present unless --reset is given.
"""
import argparse
import asyncio
import sys
from datetime import datetime, timedelta

from sqlalchemy import select, delete, func

from backend.app.core.db import SessionLocal
from backend.app.db.seed import seed_data
from backend.app.models.incident import Incident, IncidentCluster, IncidentCategory, IncidentStatus, stamp_status_transition
from backend.app.models.media import MediaAttachment
from backend.app.models.user import Responder, ResponderStatus

DEMO_PREFIX = "INC-DEMO"

# (minutes_ago, category, severity, lat, lon, location_name, description)
#
# Dedup thresholds are <=200 m, <=2 h, cosine >= 0.55 (algorithms/union_find.py),
# so duplicate groups sit within ~100 m of each other, minutes apart, and
# describe the same thing in different words. Everything else is spread across
# the city so the map and the k-d tree have real work to do.
C = IncidentCategory
DEMO_INCIDENTS = [
    # --- Duplicate group A: transformer fire, Lokhandwala market (3 reports) ---
    (104, C.FIRE, 4, 19.1412, 72.8290, "Lokhandwala Market, Andheri West",
     "Transformer box near shop no 12 at Lokhandwala market is on fire, sparks and thick smoke, shops are closing shutters."),
    (99, C.ELECTRICAL_HAZARD, 3, 19.1416, 72.8294, "Lokhandwala Market",
     "there is a fire in the electricity box at lokhandwala market, lot of smoke, please send someone"),
    (91, C.FIRE, 4, 19.1409, 72.8287, "Andheri West, near Lokhandwala",
     "Electrical fire at the market near Lokhandwala circle. Flames visible from the transformer, people gathering around."),

    # --- Duplicate group B: bus vs pedestrians, Dadar TT (2 reports) ---
    (63, C.ROAD_ACCIDENT, 5, 19.0178, 72.8478, "Dadar TT Circle",
     "A BEST bus has hit two pedestrians at Dadar TT circle, both are lying on the road and bleeding, traffic completely stopped."),
    (58, C.MEDICAL_EMERGENCY, 5, 19.0181, 72.8483, "Dadar TT",
     "bus accident at dadar TT, 2 people injured badly on the road, need ambulance urgently"),

    # --- Duplicate group C: waterlogging, Hindmata (2 reports) ---
    (41, C.FLOODING, 3, 19.0110, 72.8420, "Hindmata Junction, Dadar",
     "Knee-deep waterlogging at Hindmata junction after the rain, cars are stalling and the underpass is blocked."),
    (33, C.FLOODING, 3, 19.0114, 72.8424, "Hindmata underpass",
     "hindmata flooded again, water till the knees, vehicles stuck in the underpass"),

    # --- Singles, spread across the city ---
    (110, C.INFRASTRUCTURE_DAMAGE, 2, 19.1197, 72.8464, "Western Express Highway, Goregaon",
     "Large pothole in the middle lane on WEH near Goregaon, two-wheelers are swerving to avoid it. Been there a week."),
    (95, C.ROAD_ACCIDENT, 3, 18.9440, 72.8230, "Marine Drive",
     "Two-car collision near the Marine Drive flyover, no one seriously hurt but one car is blocking a lane."),
    (84, C.CRIMINAL_ACTIVITY, 3, 19.0596, 72.8295, "Bandra Station West",
     "Group of men fighting outside Bandra station west exit, one has a knife, shopkeepers are scared."),
    (77, C.ENVIRONMENTAL_HAZARD, 3, 19.0330, 72.8397, "Mahim Creek",
     "Strong chemical smell coming from Mahim creek, water looks oily and dead fish are floating."),
    (70, C.INFRASTRUCTURE_DAMAGE, 4, 18.9750, 72.8258, "Grant Road",
     "Part of the balcony of an old building on Grant Road has collapsed onto the footpath. Nobody hurt yet but more looks loose."),
    (52, C.MEDICAL_EMERGENCY, 4, 19.0640, 72.8990, "Kurla LTT",
     "An elderly man has collapsed on platform 2 at Kurla LTT and is not responding, no medical help here."),
    (47, C.ELECTRICAL_HAZARD, 3, 19.1075, 72.8263, "Juhu Tara Road",
     "Live wire hanging from a pole at head height on Juhu Tara road, near the bus stop. Kids walk here."),
    (28, C.FIRE, 2, 18.9388, 72.8354, "Crawford Market",
     "Small garbage fire behind Crawford market, mostly smoke, but it is close to a stack of cardboard."),
    (19, C.ROAD_ACCIDENT, 4, 19.2183, 72.9781, "Ghodbunder Road, Thane",
     "Tanker overturned on Ghodbunder road, something is leaking from it, traffic backed up for a kilometre."),
    (11, C.FLOODING, 2, 19.0896, 72.8656, "Santacruz East",
     "Drain overflowing on the main road in Santacruz east, ankle-deep water on the footpath."),
    (4, C.CRIMINAL_ACTIVITY, 2, 19.0176, 72.8562, "Sion Circle",
     "Someone is breaking into parked cars at Sion circle, saw him smash a window."),
]


async def _wipe_incidents(session):
    await session.execute(delete(MediaAttachment))
    await session.execute(delete(Incident))
    await session.execute(delete(IncidentCluster))
    await session.commit()


async def _insert(session, now: datetime):
    ids = []
    for i, (mins, cat, sev, lat, lon, place, desc) in enumerate(DEMO_INCIDENTS, start=1):
        inc = Incident(
            tracking_id=f"{DEMO_PREFIX}{i:03d}",
            category=cat,
            description=desc,
            phone_number=f"+91987650{i:04d}",
            latitude=lat,
            longitude=lon,
            location_name=place,
            severity=sev,
            priority_score=50.0,
            status=IncidentStatus.REPORTED,
            created_at=now - timedelta(minutes=mins),
        )
        session.add(inc)
        await session.flush()
        ids.append(inc.id)
    await session.commit()
    return ids


async def _process_all(ids):
    # Oldest first, so each incident only sees earlier ones as dedup candidates,
    # exactly as it would have in production.
    from backend.app.tasks.ai_tasks import _async_process
    from ai_pipeline.nlp.extractor import llm_extractor

    print(f"Processing {len(ids)} incidents through the AI pipeline "
          f"(LLM: {llm_extractor.provider.name} @ {getattr(llm_extractor.provider, 'api_url', 'in-process')})...")
    for n, incident_id in enumerate(ids, start=1):
        await _async_process(incident_id)
        print(f"  [{n:2d}/{len(ids)}] incident {incident_id} done")


async def _apply_status_spread(session):
    """
    Leave the queue looking like a real shift: a few dispatched, one being
    worked, one resolved, the two newest still untouched.
    """
    responders = (await session.execute(
        select(Responder).where(Responder.status == ResponderStatus.AVAILABLE)
    )).scalars().all()
    incidents = (await session.execute(
        select(Incident).where(Incident.tracking_id.like(f"{DEMO_PREFIX}%")).order_by(Incident.created_at)
    )).scalars().all()
    by_tid = {inc.tracking_id: inc for inc in incidents}

    def assign(tid, status, responder_idx=None, dispatched_after_min=None, resolved_after_min=None):
        # Timestamps are relative to the incident's own created_at so the
        # analytics response-time KPI has honest, plausible numbers.
        inc = by_tid[tid]
        if dispatched_after_min is not None:
            stamp_status_transition(inc, IncidentStatus.DISPATCHED, inc.created_at + timedelta(minutes=dispatched_after_min))
        if resolved_after_min is not None:
            stamp_status_transition(inc, IncidentStatus.RESOLVED, inc.created_at + timedelta(minutes=resolved_after_min))
        inc.status = status
        if responder_idx is not None and responders:
            inc.assigned_responder_id = responders[responder_idx % len(responders)].id

    assign(f"{DEMO_PREFIX}001", IncidentStatus.DISPATCHED, 0, dispatched_after_min=6)                        # transformer fire
    assign(f"{DEMO_PREFIX}004", IncidentStatus.IN_PROGRESS, 1, dispatched_after_min=4)                       # bus accident
    assign(f"{DEMO_PREFIX}009", IncidentStatus.RESOLVED, 2, dispatched_after_min=11, resolved_after_min=48)  # Marine Drive
    assign(f"{DEMO_PREFIX}012", IncidentStatus.DISPATCHED, 3, dispatched_after_min=9)                        # balcony collapse
    await session.commit()


async def _report(session):
    total = (await session.execute(select(func.count(Incident.id)))).scalar_one()
    clusters = (await session.execute(select(IncidentCluster))).scalars().all()
    statuses = (await session.execute(
        select(Incident.status, func.count(Incident.id)).group_by(Incident.status)
    )).all()
    print(f"\n{total} incidents, {len(clusters)} clusters:")
    for cl in clusters:
        members = (await session.execute(
            select(Incident.tracking_id).where(Incident.cluster_id == cl.id)
        )).scalars().all()
        print(f"  {cl.cluster_code}: {cl.corroboration_count} reports, severity {cl.merged_severity} -> {', '.join(members)}")
    print("statuses: " + ", ".join(f"{s.value}={c}" for s, c in statuses))


async def seed_demo(process: bool = True, reset: bool = False):
    await seed_data()  # users + responders; no-op if already present

    async with SessionLocal() as session:
        if reset:
            await _wipe_incidents(session)
        existing = (await session.execute(
            select(func.count(Incident.id)).where(Incident.tracking_id.like(f"{DEMO_PREFIX}%"))
        )).scalar_one()
        if existing:
            print(f"{existing} demo incidents already present - use --reset to reseed.")
            return
        ids = await _insert(session, datetime.utcnow())
        print(f"Inserted {len(ids)} demo incidents.")

    if process:
        await _process_all(ids)

    async with SessionLocal() as session:
        await _apply_status_spread(session)
        await _report(session)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--no-process", action="store_true", help="insert only; leave everything REPORTED")
    parser.add_argument("--reset", action="store_true", help="delete all incidents/clusters/media first")
    args = parser.parse_args()
    try:
        asyncio.run(seed_demo(process=not args.no_process, reset=args.reset))
    except KeyboardInterrupt:
        sys.exit(130)
