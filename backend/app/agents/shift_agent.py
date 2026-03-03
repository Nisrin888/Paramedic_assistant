"""
Shift Agent — Returns current shift info, partner details, outstanding items.
"""
from datetime import datetime, timezone
from app.database import get_supabase


async def get_shift_info(paramedic_id: str) -> dict:
    """Get the current or most recent shift for this paramedic."""
    db = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    # Find active shift (current time within start/end) or most recent
    result = (
        db.table("shifts")
        .select("*, medic1:paramedics!shifts_medic_1_id_fkey(*), medic2:paramedics!shifts_medic_2_id_fkey(*)")
        .or_(f"medic_1_id.eq.{paramedic_id},medic_2_id.eq.{paramedic_id}")
        .order("start_time", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        return {"shift": None, "message": "No shift found"}

    shift = result.data[0]
    medic1 = shift.get("medic1", {})
    medic2 = shift.get("medic2", {})

    # Determine partner
    if medic1 and medic1.get("paramedic_id") == paramedic_id:
        partner = medic2
    else:
        partner = medic1

    return {
        "shift_id": shift["shift_id"],
        "station": shift.get("station", ""),
        "start_time": shift["start_time"],
        "end_time": shift["end_time"],
        "vehicle_number": shift.get("vehicle_number", ""),
        "vehicle_description": shift.get("vehicle_description", ""),
        "service": shift.get("service", ""),
        "partner": {
            "name": f"{partner.get('first_name', '')} {partner.get('last_name', '')}".strip() if partner else "None assigned",
            "badge_number": partner.get("badge_number", "") if partner else "",
        },
    }


async def get_outstanding_items(user_id: str) -> dict:
    """Get outstanding/pending items for this user."""
    db = get_supabase()

    result = (
        db.table("outstanding_items")
        .select("*")
        .eq("user_id", user_id)
        .in_("status", ["pending", "in_progress"])
        .order("priority")
        .execute()
    )

    items = result.data or []
    return {
        "count": len(items),
        "items": items,
    }
