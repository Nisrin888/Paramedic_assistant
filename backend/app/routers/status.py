"""
Form 4 Status Check REST endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.database import get_supabase
from app.agents.checklist_agent import get_status_check

router = APIRouter(prefix="/status", tags=["status"])


@router.get("/check")
async def status_check(user: dict = Depends(get_current_user)):
    """Get Form 4 compliance items for the current user.
    Returns GOOD/BAD/UNKNOWN status with guidance for BAD items.
    """
    result = await get_status_check(user["user_id"])
    return result


@router.post("/acknowledge/{item_id}")
async def acknowledge_item(
    item_id: str,
    user: dict = Depends(get_current_user),
):
    """Mark a Form 4 item as acknowledged (user has seen the guidance)."""
    db = get_supabase()

    result = (
        db.table("form4_user_state")
        .update({"acknowledged": True})
        .eq("user_id", user["user_id"])
        .eq("item_id", item_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Item not found")

    return {"success": True, "item_id": item_id}


@router.post("/update/{item_id}")
async def update_item_status(
    item_id: str,
    new_status: str,
    user: dict = Depends(get_current_user),
):
    """Update a Form 4 item status (e.g. mark BAD item as fixed → GOOD)."""
    if new_status not in ("GOOD", "BAD", "UNKNOWN"):
        raise HTTPException(status_code=400, detail="Status must be GOOD, BAD, or UNKNOWN")

    db = get_supabase()

    result = (
        db.table("form4_user_state")
        .update({"status": new_status, "acknowledged": False})
        .eq("user_id", user["user_id"])
        .eq("item_id", item_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Item not found")

    return {"success": True, "item_id": item_id, "status": new_status}
