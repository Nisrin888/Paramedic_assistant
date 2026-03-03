"""
Forms REST endpoints — CRUD, preview, submit, email.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.database import get_supabase
from app.services.email_service import send_form_email

router = APIRouter(prefix="/forms", tags=["forms"])


@router.get("/drafts")
async def list_drafts(user: dict = Depends(get_current_user)):
    """Get all draft (unsubmitted) forms for the current user."""
    db = get_supabase()

    para = db.table("paramedics").select("paramedic_id").eq("user_id", user["user_id"]).single().execute()
    if not para.data:
        return {"occurrence_drafts": [], "teddy_bear_drafts": []}

    pid = para.data["paramedic_id"]

    occ = (
        db.table("occurrence_reports")
        .select("report_id, classification, brief_description, incident_date_time, created_at")
        .eq("creator_id", pid)
        .eq("status", "Draft")
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "occurrence_drafts": occ.data or [],
    }


@router.get("/{form_type}/{form_id}/preview")
async def preview_form(
    form_type: str,
    form_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a structured preview of a form before submitting."""
    db = get_supabase()

    if form_type == "occurrence":
        result = db.table("occurrence_reports").select("*").eq("report_id", form_id).single().execute()
    elif form_type == "teddy-bear":
        result = db.table("teddy_bear_tracking").select("*").eq("tracking_id", form_id).single().execute()
    else:
        raise HTTPException(status_code=400, detail="form_type must be 'occurrence' or 'teddy-bear'")

    if not result.data:
        raise HTTPException(status_code=404, detail="Form not found")

    return result.data


@router.post("/{form_type}/{form_id}/submit")
async def submit_form(
    form_type: str,
    form_id: str,
    user: dict = Depends(get_current_user),
):
    """Submit a form — changes status from Draft to Submitted."""
    db = get_supabase()

    if form_type == "occurrence":
        # Check current status to prevent duplicate submission
        existing = db.table("occurrence_reports").select("status").eq("report_id", form_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Report not found")
        if existing.data["status"] == "Submitted":
            raise HTTPException(status_code=409, detail="Already submitted")
        if existing.data["status"] == "Reviewed":
            raise HTTPException(status_code=409, detail="Already reviewed")

        result = (
            db.table("occurrence_reports")
            .update({"status": "Submitted"})
            .eq("report_id", form_id)
            .execute()
        )
        return {"success": True, "status": "Submitted", "record": result.data[0] if result.data else {}}

    elif form_type == "teddy-bear":
        # Teddy bear has no status — just verify it exists
        result = db.table("teddy_bear_tracking").select("*").eq("tracking_id", form_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Form not found")
        return {"success": True, "record": result.data}

    raise HTTPException(status_code=400, detail="form_type must be 'occurrence' or 'teddy-bear'")


@router.post("/{form_type}/{form_id}/email")
async def email_form(
    form_type: str,
    form_id: str,
    recipient_email: str = None,
    user: dict = Depends(get_current_user),
):
    """Email a completed form summary to a recipient."""
    db = get_supabase()

    if form_type == "occurrence":
        result = db.table("occurrence_reports").select("*").eq("report_id", form_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Report not found")
        form_data = result.data
        subject = f"Occurrence Report — {form_data.get('occurrence_reference', form_id)}"
    elif form_type == "teddy-bear":
        result = db.table("teddy_bear_tracking").select("*").eq("tracking_id", form_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Form not found")
        form_data = result.data
        subject = f"Teddy Bear Tracking — {form_id[:8]}"
    else:
        raise HTTPException(status_code=400, detail="form_type must be 'occurrence' or 'teddy-bear'")

    # Default: send to the paramedic's supervisor
    to = recipient_email
    if not to:
        para = db.table("paramedics").select("paramedic_id").eq("user_id", user["user_id"]).single().execute()
        if para.data:
            mapping = (
                db.table("supervisor_mappings")
                .select("supervisor_id")
                .eq("paramedic_id", para.data["paramedic_id"])
                .limit(1)
                .execute()
            )
            if mapping.data:
                sup = (
                    db.table("supervisors")
                    .select("user_id")
                    .eq("supervisor_id", mapping.data[0]["supervisor_id"])
                    .single()
                    .execute()
                )
                if sup.data:
                    sup_user = db.table("users").select("email").eq("user_id", sup.data["user_id"]).single().execute()
                    if sup_user.data:
                        to = sup_user.data["email"]
    if not to:
        raise HTTPException(status_code=400, detail="No supervisor email found")

    ft = "occurrence" if form_type == "occurrence" else "teddy_bear"
    try:
        email_result = await send_form_email(to, subject, form_data, ft)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {e}")

    if "error" in email_result:
        raise HTTPException(status_code=500, detail=email_result["error"])

    return email_result


@router.patch("/{form_type}/{form_id}")
async def update_form(
    form_type: str,
    form_id: str,
    updates: dict,
    user: dict = Depends(get_current_user),
):
    """Update specific fields on a draft form."""
    db = get_supabase()

    if form_type == "occurrence":
        # Only allow updates on Draft forms
        existing = db.table("occurrence_reports").select("status").eq("report_id", form_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Report not found")
        if existing.data["status"] != "Draft":
            raise HTTPException(status_code=409, detail="Can only edit Draft forms")

        # Filter to only known columns
        allowed = {
            "classification", "classification_details", "occurrence_type",
            "call_number", "brief_description", "description_of_event",
            "action_taken", "suggested_resolution", "management_notes",
            "other_services_involved",
        }
        safe_updates = {k: v for k, v in updates.items() if k in allowed}
        if not safe_updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        result = (
            db.table("occurrence_reports")
            .update(safe_updates)
            .eq("report_id", form_id)
            .execute()
        )
        return {"success": True, "updated_fields": list(safe_updates.keys()), "record": result.data[0] if result.data else {}}

    raise HTTPException(status_code=400, detail="form_type must be 'occurrence'")
