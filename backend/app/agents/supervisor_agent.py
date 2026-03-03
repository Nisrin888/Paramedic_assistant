"""
Supervisor Agent — Handles supervisor-specific queries:
  - Team overview & compliance
  - Report review & approval
  - Shift summaries & insights
"""
from app.database import get_supabase


async def get_team_overview(supervisor_id: str) -> dict:
    """Get all paramedics mapped to this supervisor with their current status."""
    db = get_supabase()

    # Get mapped paramedics
    mappings = (
        db.table("supervisor_mappings")
        .select("*, paramedics(*, users(*))")
        .eq("supervisor_id", supervisor_id)
        .execute()
    )

    team = []
    for m in mappings.data or []:
        para = m.get("paramedics", {})
        user = para.get("users", {})
        team.append({
            "paramedic_id": para.get("paramedic_id"),
            "name": f"{para.get('first_name', '')} {para.get('last_name', '')}",
            "badge_number": para.get("badge_number"),
            "station": m.get("station_assignment"),
            "is_active": user.get("is_active", False),
        })

    return {
        "team_size": len(team),
        "paramedics": team,
    }


async def get_submitted_reports(supervisor_id: str, paramedic_name: str | None = None, status_filter: str = "Submitted") -> dict:
    """Get reports pending review for this supervisor's team."""
    db = get_supabase()

    # Get paramedic IDs under this supervisor
    mappings = (
        db.table("supervisor_mappings")
        .select("paramedic_id")
        .eq("supervisor_id", supervisor_id)
        .execute()
    )
    para_ids = [m["paramedic_id"] for m in mappings.data or []]

    if not para_ids:
        return {"occurrence_reports": [], "teddy_bears": [], "total": 0}

    # Occurrence reports
    occ_query = (
        db.table("occurrence_reports")
        .select("*, creator:paramedics!occurrence_reports_creator_id_fkey(first_name, last_name, badge_number)")
        .in_("creator_id", para_ids)
        .eq("status", status_filter)
        .order("created_at", desc=True)
    )
    occ_result = occ_query.execute()

    # Teddy bear forms
    tb_query = (
        db.table("teddy_bear_tracking")
        .select("*, primary_medic:paramedics!teddy_bear_tracking_primary_medic_id_fkey(first_name, last_name, badge_number)")
        .in_("primary_medic_id", para_ids)
        .order("distribution_timestamp", desc=True)
    )
    tb_result = tb_query.execute()

    occurrence_reports = []
    for r in occ_result.data or []:
        creator = r.get("creator", {})
        name = f"{creator.get('first_name', '')} {creator.get('last_name', '')}"
        # Filter by name if requested
        if paramedic_name and paramedic_name.lower() not in name.lower():
            continue
        occurrence_reports.append({
            "report_id": r["report_id"],
            "creator_name": name,
            "badge_number": creator.get("badge_number"),
            "classification": r.get("classification"),
            "brief_description": r.get("brief_description"),
            "incident_date_time": r.get("incident_date_time"),
            "status": r.get("status"),
        })

    teddy_bears = []
    for t in tb_result.data or []:
        medic = t.get("primary_medic", {})
        name = f"{medic.get('first_name', '')} {medic.get('last_name', '')}"
        if paramedic_name and paramedic_name.lower() not in name.lower():
            continue
        teddy_bears.append({
            "tracking_id": t["tracking_id"],
            "medic_name": name,
            "recipient_type": t.get("recipient_type"),
            "recipient_age": t.get("recipient_age"),
            "distribution_timestamp": t.get("distribution_timestamp"),
        })

    return {
        "occurrence_reports": occurrence_reports,
        "teddy_bears": teddy_bears,
        "total": len(occurrence_reports) + len(teddy_bears),
    }


async def review_report(report_id: str, management_notes: str | None = None) -> dict:
    """Mark an occurrence report as reviewed with optional notes."""
    db = get_supabase()

    update_data = {"status": "Reviewed"}
    if management_notes:
        update_data["management_notes"] = management_notes

    result = (
        db.table("occurrence_reports")
        .update(update_data)
        .eq("report_id", report_id)
        .execute()
    )

    if not result.data:
        return {"success": False, "error": "Report not found"}

    return {"success": True, "report_id": report_id, "new_status": "Reviewed"}


async def get_team_compliance(supervisor_id: str) -> dict:
    """Get Form4 compliance for all paramedics under this supervisor."""
    db = get_supabase()

    # Get paramedic user_ids under this supervisor
    mappings = (
        db.table("supervisor_mappings")
        .select("paramedics(paramedic_id, first_name, last_name, badge_number, user_id)")
        .eq("supervisor_id", supervisor_id)
        .execute()
    )

    team_compliance = []
    for m in mappings.data or []:
        para = m.get("paramedics", {})
        user_id = para.get("user_id")
        if not user_id:
            continue

        # Get Form4 state for this paramedic
        state_result = (
            db.table("form4_user_state")
            .select("*, form4_reference(label, urgency_class)")
            .eq("user_id", user_id)
            .execute()
        )

        items = state_result.data or []
        good = sum(1 for i in items if i["status"] == "GOOD")
        bad = sum(1 for i in items if i["status"] == "BAD")
        unknown = sum(1 for i in items if i["status"] == "UNKNOWN")
        bad_items = [
            {
                "item_id": i["item_id"],
                "label": i.get("form4_reference", {}).get("label", i["item_id"]),
                "urgency": i.get("form4_reference", {}).get("urgency_class", "INFO"),
            }
            for i in items if i["status"] == "BAD"
        ]

        team_compliance.append({
            "name": f"{para.get('first_name', '')} {para.get('last_name', '')}",
            "badge_number": para.get("badge_number"),
            "good": good,
            "bad": bad,
            "unknown": unknown,
            "total": len(items),
            "bad_items": bad_items,
        })

    return {"team_compliance": team_compliance}


async def get_shift_summary(supervisor_id: str, shift_id: str | None = None) -> dict:
    """Get shift summary — forms completed, teddy bears, outstanding items."""
    db = get_supabase()

    # Get paramedic IDs
    mappings = (
        db.table("supervisor_mappings")
        .select("paramedic_id")
        .eq("supervisor_id", supervisor_id)
        .execute()
    )
    para_ids = [m["paramedic_id"] for m in mappings.data or []]

    if not para_ids:
        return {"message": "No paramedics assigned"}

    # Count occurrence reports
    occ_result = (
        db.table("occurrence_reports")
        .select("report_id, status, classification")
        .in_("creator_id", para_ids)
        .execute()
    )
    reports = occ_result.data or []

    # Count teddy bears
    tb_result = (
        db.table("teddy_bear_tracking")
        .select("tracking_id, recipient_type")
        .in_("primary_medic_id", para_ids)
        .execute()
    )
    teddy_bears = tb_result.data or []

    # Outstanding items
    user_ids_result = (
        db.table("paramedics")
        .select("user_id")
        .in_("paramedic_id", para_ids)
        .execute()
    )
    user_ids = [u["user_id"] for u in user_ids_result.data or []]

    outstanding_result = (
        db.table("outstanding_items")
        .select("item_id, status, priority")
        .in_("user_id", user_ids)
        .in_("status", ["pending", "in_progress"])
        .execute()
    )
    outstanding = outstanding_result.data or []

    return {
        "occurrence_reports": {
            "total": len(reports),
            "draft": sum(1 for r in reports if r["status"] == "Draft"),
            "submitted": sum(1 for r in reports if r["status"] == "Submitted"),
            "reviewed": sum(1 for r in reports if r["status"] == "Reviewed"),
        },
        "teddy_bears_distributed": len(teddy_bears),
        "outstanding_items": len(outstanding),
    }


async def get_team_insights(supervisor_id: str) -> dict:
    """Aggregate data for AI-generated insights."""
    db = get_supabase()

    mappings = (
        db.table("supervisor_mappings")
        .select("paramedic_id")
        .eq("supervisor_id", supervisor_id)
        .execute()
    )
    para_ids = [m["paramedic_id"] for m in mappings.data or []]

    if not para_ids:
        return {"message": "No paramedics assigned"}

    # Classification breakdown
    occ_result = (
        db.table("occurrence_reports")
        .select("classification, status")
        .in_("creator_id", para_ids)
        .execute()
    )
    reports = occ_result.data or []
    classifications = {}
    for r in reports:
        c = r.get("classification") or "Unclassified"
        classifications[c] = classifications.get(c, 0) + 1

    # Teddy bear recipient breakdown
    tb_result = (
        db.table("teddy_bear_tracking")
        .select("recipient_type, recipient_age")
        .in_("primary_medic_id", para_ids)
        .execute()
    )
    teddy_bears = tb_result.data or []
    recipient_types = {}
    for t in teddy_bears:
        rt = t.get("recipient_type") or "Unknown"
        recipient_types[rt] = recipient_types.get(rt, 0) + 1

    return {
        "total_reports": len(reports),
        "classification_breakdown": classifications,
        "teddy_bears_total": len(teddy_bears),
        "recipient_type_breakdown": recipient_types,
    }
