"""
Shift management REST endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.database import get_supabase
from app.agents.shift_agent import get_shift_info, get_outstanding_items
from app.agents.checklist_agent import get_status_check
from app.services.weather_service import get_current_weather

router = APIRouter(prefix="/shifts", tags=["shifts"])

# Default coordinates (Toronto area — adjust per deployment)
DEFAULT_LAT = 43.7
DEFAULT_LON = -79.4


@router.get("/current")
async def current_shift(user: dict = Depends(get_current_user)):
    """Get the current/most recent shift for the logged-in paramedic."""
    if user["role_type"] != "Paramedic":
        raise HTTPException(status_code=403, detail="Only paramedics have shifts")

    db = get_supabase()
    para_result = (
        db.table("paramedics")
        .select("paramedic_id")
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )

    if not para_result.data:
        raise HTTPException(status_code=404, detail="Paramedic profile not found")

    result = await get_shift_info(para_result.data["paramedic_id"])
    return result


@router.get("/outstanding")
async def outstanding_items(user: dict = Depends(get_current_user)):
    """Get outstanding/pending items for the current user."""
    result = await get_outstanding_items(user["user_id"])
    return result


@router.get("/pre-brief")
async def pre_shift_brief(
    lat: float = DEFAULT_LAT,
    lon: float = DEFAULT_LON,
    user: dict = Depends(get_current_user),
):
    """Get a pre-shift briefing combining shift info, checklist status,
    outstanding items, and weather.
    """
    if user["role_type"] != "Paramedic":
        raise HTTPException(status_code=403, detail="Only paramedics have pre-shift briefings")

    db = get_supabase()
    para_result = (
        db.table("paramedics")
        .select("paramedic_id, first_name, last_name, badge_number")
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )

    if not para_result.data:
        raise HTTPException(status_code=404, detail="Paramedic profile not found")

    paramedic = para_result.data

    # Gather all briefing data
    shift = await get_shift_info(paramedic["paramedic_id"])
    checklist = await get_status_check(user["user_id"])
    outstanding = await get_outstanding_items(user["user_id"])
    try:
        weather = await get_current_weather(lat, lon)
    except Exception as e:
        weather = {"error": str(e), "briefing": "Weather unavailable"}

    briefing = {
        "paramedic": {
            "name": f"{paramedic['first_name']} {paramedic['last_name']}",
            "badge_number": paramedic["badge_number"],
        },
        "shift": shift,
        "checklist": {
            "summary": checklist["summary"],
            "blocking_count": checklist["blocking_count"],
            "blocking_items": checklist["blocking_items"],
            "total_items": len(checklist["items"]),
        },
        "outstanding_items": outstanding,
        "weather": weather,
    }

    return briefing


@router.get("/{shift_id}/summary")
async def shift_summary(
    shift_id: str,
    user: dict = Depends(get_current_user),
):
    """Get end-of-shift summary — forms completed, teddy bears, outstanding items."""
    db = get_supabase()

    # Verify shift exists
    shift_result = db.table("shifts").select("*").eq("shift_id", shift_id).single().execute()
    if not shift_result.data:
        raise HTTPException(status_code=404, detail="Shift not found")

    shift = shift_result.data

    # Occurrence reports for this shift
    reports = (
        db.table("occurrence_reports")
        .select("report_id, classification, status, brief_description")
        .eq("shift_id", shift_id)
        .execute()
    )

    # Teddy bear distributions for this shift
    teddy_bears = (
        db.table("teddy_bear_tracking")
        .select("tracking_id, recipient_type, recipient_age")
        .eq("shift_id", shift_id)
        .execute()
    )

    # Outstanding items for medics on this shift
    medic_ids = [shift.get("medic_1_id"), shift.get("medic_2_id")]
    medic_ids = [m for m in medic_ids if m]

    outstanding = []
    for medic_id in medic_ids:
        # Get user_id for this paramedic
        para = db.table("paramedics").select("user_id").eq("paramedic_id", medic_id).single().execute()
        if para.data:
            items = (
                db.table("outstanding_items")
                .select("*")
                .eq("user_id", para.data["user_id"])
                .eq("shift_id", shift_id)
                .execute()
            )
            outstanding.extend(items.data or [])

    reports_data = reports.data or []
    teddy_data = teddy_bears.data or []

    summary = {
        "shift_id": shift_id,
        "station": shift.get("station", ""),
        "start_time": shift["start_time"],
        "end_time": shift["end_time"],
        "reports": {
            "total": len(reports_data),
            "submitted": sum(1 for r in reports_data if r["status"] == "Submitted"),
            "draft": sum(1 for r in reports_data if r["status"] == "Draft"),
            "reviewed": sum(1 for r in reports_data if r["status"] == "Reviewed"),
            "items": reports_data,
        },
        "teddy_bears": {
            "total": len(teddy_data),
            "items": teddy_data,
        },
        "outstanding_items": {
            "total": len(outstanding),
            "pending": sum(1 for i in outstanding if i["status"] == "pending"),
            "completed": sum(1 for i in outstanding if i["status"] == "completed"),
            "deferred": sum(1 for i in outstanding if i["status"] == "deferred"),
            "items": outstanding,
        },
    }

    return summary
