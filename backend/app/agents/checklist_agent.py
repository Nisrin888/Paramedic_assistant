"""
Checklist Agent — Reads Form4 status and provides guidance for BAD items.
"""
from app.database import get_supabase


async def get_status_check(user_id: str) -> dict:
    """Get Form4 status items for the current user with guidance for BAD items."""
    db = get_supabase()

    # Get user's Form4 state joined with reference data
    result = (
        db.table("form4_user_state")
        .select("*, form4_reference(*)")
        .eq("user_id", user_id)
        .execute()
    )

    items = []
    blocking = []
    for row in result.data or []:
        ref = row.get("form4_reference", {})
        item = {
            "item_id": row["item_id"],
            "label": ref.get("label", row["item_id"]),
            "status": row["status"],
            "urgency": ref.get("urgency_class", "INFO"),
            "acknowledged": row["acknowledged"],
        }

        # Include guidance for BAD items
        if row["status"] == "BAD":
            item["guidance_summary"] = ref.get("guidance_summary", "")
            item["guidance_steps"] = ref.get("guidance_steps", [])
            if ref.get("urgency_class") == "BLOCKING":
                blocking.append(item)

        items.append(item)

    return {
        "items": items,
        "blocking_count": len(blocking),
        "blocking_items": blocking,
        "summary": _build_summary(items),
    }


def _build_summary(items: list) -> str:
    good = sum(1 for i in items if i["status"] == "GOOD")
    bad = sum(1 for i in items if i["status"] == "BAD")
    unknown = sum(1 for i in items if i["status"] == "UNKNOWN")
    total = len(items)
    return f"{good}/{total} items GOOD, {bad} need attention, {unknown} unchecked"
