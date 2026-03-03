"""
Seed script — populates Supabase with demo data for the hackathon.
Run: python seed_data.py
"""
import hashlib
import sys
import os

# Ensure app is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_supabase


def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def seed():
    db = get_supabase()

    # ── Users ──────────────────────────────────────────────
    users = [
        {
            "user_id": "00000000-0000-0000-0000-000000000001",
            "email": "Team01@EffectiveAl.net",
            "password_hash": _hash("medic123"),
            "role_type": "Paramedic",
            "is_active": True,
            "is_first_login": True,
        },
        {
            "user_id": "00000000-0000-0000-0000-000000000002",
            "email": "Team02@EffectiveAl.net",
            "password_hash": _hash("medic123"),
            "role_type": "Paramedic",
            "is_active": True,
            "is_first_login": True,
        },
        {
            "user_id": "00000000-0000-0000-0000-000000000003",
            "email": "chief@EffectiveAl.net",
            "password_hash": _hash("super123"),
            "role_type": "Supervisor",
            "is_active": True,
            "is_first_login": False,
        },
    ]
    db.table("users").upsert(users, on_conflict="user_id").execute()
    print(f"  Seeded {len(users)} users")

    # ── Paramedics ─────────────────────────────────────────
    paramedics = [
        {
            "paramedic_id": "10000000-0000-0000-0000-000000000001",
            "user_id": "00000000-0000-0000-0000-000000000001",
            "first_name": "Jordan",
            "last_name": "Riley",
            "badge_number": "B-3047",
        },
        {
            "paramedic_id": "10000000-0000-0000-0000-000000000002",
            "user_id": "00000000-0000-0000-0000-000000000002",
            "first_name": "Alex",
            "last_name": "Chen",
            "badge_number": "B-2198",
        },
    ]
    db.table("paramedics").upsert(paramedics, on_conflict="paramedic_id").execute()
    print(f"  Seeded {len(paramedics)} paramedics")

    # ── Supervisors ────────────────────────────────────────
    supervisors = [
        {
            "supervisor_id": "20000000-0000-0000-0000-000000000001",
            "user_id": "00000000-0000-0000-0000-000000000003",
            "first_name": "Sam",
            "last_name": "Torres",
            "title": "Chief",
            "expert_type": "EMS",
        },
    ]
    db.table("supervisors").upsert(supervisors, on_conflict="supervisor_id").execute()
    print(f"  Seeded {len(supervisors)} supervisors")

    # ── Supervisor Mappings ────────────────────────────────
    mappings = [
        {
            "paramedic_id": "10000000-0000-0000-0000-000000000001",
            "supervisor_id": "20000000-0000-0000-0000-000000000001",
            "station_assignment": "Main St.",
        },
        {
            "paramedic_id": "10000000-0000-0000-0000-000000000002",
            "supervisor_id": "20000000-0000-0000-0000-000000000001",
            "station_assignment": "Main St.",
        },
    ]
    db.table("supervisor_mappings").upsert(mappings, on_conflict="mapping_id").execute()
    print(f"  Seeded {len(mappings)} supervisor mappings")

    # ── Shifts (from EAI schedule scrape — March 2026) ─────
    # Team01 (Jordan) / Team02 (Alex) are assigned:
    #   Sun-Tue each week → Main St., Unit 1122, 7:00 AM – 7:00 PM
    # Source: https://www.effectiveai.net/calendars/march-2026.html
    team01_02_days = [
        1, 2, 3,        # Week 1: Sun Mar 01 – Tue Mar 03
        8, 9, 10,       # Week 2: Sun Mar 08 – Tue Mar 10
        15, 16, 17,     # Week 3: Sun Mar 15 – Tue Mar 17
        22, 23, 24,     # Week 4: Sun Mar 22 – Tue Mar 24
        29, 30, 31,     # Week 5: Sun Mar 29 – Tue Mar 31
    ]

    shifts = []
    for i, day in enumerate(team01_02_days):
        shifts.append({
            "shift_id": f"30000000-0000-0000-0000-{str(i + 1).zfill(12)}",
            "medic_1_id": "10000000-0000-0000-0000-000000000001",
            "medic_2_id": "10000000-0000-0000-0000-000000000002",
            "station": "Main St.",
            "start_time": f"2026-03-{str(day).zfill(2)}T07:00:00Z",
            "end_time": f"2026-03-{str(day).zfill(2)}T19:00:00Z",
            "vehicle_number": "1122",
            "vehicle_description": "Unit 1122",
            "service": "EAI Ambulance Service",
        })
    db.table("shifts").upsert(shifts, on_conflict="shift_id").execute()
    print(f"  Seeded {len(shifts)} shifts")

    # ── User Personas ──────────────────────────────────────
    personas = [
        {
            "user_id": "00000000-0000-0000-0000-000000000001",
            "preferred_name": "Jordan",
            "speaking_style": "Friendly",
            "voice_preference": "Female",
            "guidance_level_override": "FULL",
        },
        {
            "user_id": "00000000-0000-0000-0000-000000000002",
            "preferred_name": "Alex",
            "speaking_style": "Concise",
            "voice_preference": "Male",
            "guidance_level_override": "BRIEF",
        },
        {
            "user_id": "00000000-0000-0000-0000-000000000003",
            "preferred_name": "Sam",
            "speaking_style": "Professional",
            "voice_preference": "Male",
            "guidance_level_override": "FULL",
        },
    ]
    db.table("user_personas").upsert(personas, on_conflict="persona_id").execute()
    print(f"  Seeded {len(personas)} personas")

    # ── Form4 Reference Items ──────────────────────────────
    form4_items = [
        {
            "id": "ACRc",
            "label": "ACR Completion",
            "description": "Ambulance Call Report must be completed within 24 hours of call completion.",
            "urgency_class": "BLOCKING",
            "guidance_summary": "Complete all fields on the ACR for each patient contact.",
            "guidance_steps": [
                "Open the ACR form",
                "Fill in patient demographics",
                "Document assessment findings",
                "Record treatment provided",
                "Submit for supervisor review",
            ],
        },
        {
            "id": "VEHi",
            "label": "Vehicle Inspection",
            "description": "Daily vehicle and equipment inspection must be performed at shift start.",
            "urgency_class": "BLOCKING",
            "guidance_summary": "Walk around the vehicle and verify all equipment is present and functional.",
            "guidance_steps": [
                "Check exterior lights and sirens",
                "Verify tire condition and pressure",
                "Inspect interior medical equipment",
                "Check oxygen levels and suction",
                "Test defibrillator and monitor",
                "Sign off on inspection form",
            ],
        },
        {
            "id": "NAR",
            "label": "Narcotics Count",
            "description": "Controlled substance count must match records at shift start and end.",
            "urgency_class": "BLOCKING",
            "guidance_summary": "Count and verify all narcotics against the log.",
            "guidance_steps": [
                "Open the narcotics safe",
                "Count each medication against the log",
                "Note any discrepancies immediately",
                "Both medics must sign off",
            ],
        },
        {
            "id": "CEd",
            "label": "Continuing Education",
            "description": "Track required CE hours for license renewal.",
            "urgency_class": "TIME_BOUND",
            "guidance_summary": "Ensure CE hours are on track for the renewal period.",
            "guidance_steps": [
                "Check current CE hours logged",
                "Identify any gaps in required categories",
                "Register for upcoming CE opportunities",
            ],
        },
        {
            "id": "UNIf",
            "label": "Uniform Compliance",
            "description": "Verify proper uniform and PPE at shift start.",
            "urgency_class": "INFO",
            "guidance_summary": "Ensure all required uniform items and PPE are present.",
            "guidance_steps": [
                "Check uniform is clean and complete",
                "Verify ID badge is visible",
                "Confirm PPE availability (gloves, mask, eye protection)",
            ],
        },
    ]
    db.table("form4_reference").upsert(form4_items, on_conflict="id").execute()
    print(f"  Seeded {len(form4_items)} Form4 reference items")

    # ── Form4 User State (demo) ────────────────────────────
    form4_states = [
        {"user_id": "00000000-0000-0000-0000-000000000001", "item_id": "ACRc", "status": "BAD", "count": 2},
        {"user_id": "00000000-0000-0000-0000-000000000001", "item_id": "VEHi", "status": "UNKNOWN", "count": 0},
        {"user_id": "00000000-0000-0000-0000-000000000001", "item_id": "NAR", "status": "GOOD", "count": 0},
        {"user_id": "00000000-0000-0000-0000-000000000001", "item_id": "CEd", "status": "GOOD", "count": 12},
        {"user_id": "00000000-0000-0000-0000-000000000001", "item_id": "UNIf", "status": "GOOD", "count": 0},
    ]
    db.table("form4_user_state").upsert(form4_states, on_conflict="user_id,item_id").execute()
    print(f"  Seeded {len(form4_states)} Form4 user states")

    print("\nSeed complete!")


if __name__ == "__main__":
    print("Seeding database...")
    seed()
