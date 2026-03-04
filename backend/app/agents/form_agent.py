"""
Form Agent — Manages conversational form filling for:
  - EMS Occurrence Reports
  - Teddy Bear Comfort Program Tracking

Hybrid approach:
  - Auto-fills fields from DB (badge, name, shift, vehicle, service, time)
  - Asks user for fields only they can provide (description, classification, etc.)

Draft persistence:
  - A Draft row is created in DB the moment a form starts
  - Every field update writes to DB immediately
  - Submit just flips status from Draft → Submitted
  - If interrupted, the Draft persists and can be resumed
"""
from datetime import datetime, timezone
from typing import Optional
from app.database import get_supabase


# ── Field definitions ─────────────────────────────────────────────

OCCURRENCE_FIELDS = {
    # Auto-filled from context
    "incident_date_time": {"label": "Date & Time", "auto": True, "required": True},
    "badge_number": {"label": "Badge #", "auto": True, "required": True},
    "report_creator": {"label": "Report Creator", "auto": True, "required": True},
    "creator_details": {"label": "Creator Details", "auto": True, "required": False},
    "requested_by": {"label": "Requested By", "auto": True, "required": True},
    "requested_by_details": {"label": "Requested By Details", "auto": True, "required": False},
    "service": {"label": "Service", "auto": True, "required": True},
    "vehicle_number": {"label": "Vehicle #", "auto": True, "required": True},
    "vehicle_description": {"label": "Vehicle Description", "auto": True, "required": False},
    "role": {"label": "Role", "auto": True, "required": True},
    "role_description": {"label": "Role Description", "auto": True, "required": False},
    "occurrence_reference": {"label": "Occurrence Reference #", "auto": True, "required": False},
    # User-provided
    "classification": {"label": "Classification", "auto": False, "required": True},
    "occurrence_type": {"label": "Occurrence Type", "auto": False, "required": False},
    "call_number": {"label": "Call Number", "auto": False, "required": False},
    "brief_description": {"label": "Brief Description", "auto": False, "required": True},
    "description_of_event": {"label": "Description of Event", "auto": False, "required": True},
    "action_taken": {"label": "Action Taken", "auto": False, "required": False},
    "suggested_resolution": {"label": "Suggested Resolution", "auto": False, "required": False},
    "other_services_involved": {"label": "Other Services Involved", "auto": False, "required": False},
    "classification_details": {"label": "Classification Details", "auto": False, "required": False},
    "management_notes": {"label": "Management Notes", "auto": False, "required": False},
}

TEDDY_BEAR_FIELDS = {
    # Auto-filled
    "distribution_timestamp": {"label": "Date & Time", "auto": True, "required": True},
    # User-provided
    "recipient_type": {"label": "Recipient Type (Patient/Family/Bystander/Other)", "auto": False, "required": True},
    "recipient_age": {"label": "Recipient Age", "auto": False, "required": True},
    "recipient_gender": {"label": "Recipient Gender", "auto": False, "required": True},
}

# DB columns for each form type (what gets written to DB)
OCCURRENCE_DB_COLS = [
    "creator_id", "shift_id", "incident_date_time", "classification",
    "classification_details", "occurrence_type", "occurrence_reference",
    "call_number", "brief_description", "description_of_event",
    "action_taken", "suggested_resolution", "management_notes",
    "other_services_involved", "service", "vehicle_number",
    "vehicle_description", "role", "role_description", "badge_number",
    "requested_by", "requested_by_details", "report_creator",
    "creator_details", "status",
]

TEDDY_BEAR_DB_COLS = [
    "primary_medic_id", "secondary_medic_id", "shift_id",
    "distribution_timestamp", "recipient_type", "recipient_age",
    "recipient_gender",
]


class FormSession:
    """Tracks the state of a form being filled conversationally.
    Auto-saves to DB on every change."""

    def __init__(self, form_type: str, user_context: dict, draft_id: str = None):
        self.form_type = form_type  # "occurrence" or "teddy_bear"
        self.fields = {}  # filled field values
        self.user_context = user_context  # logged-in user info
        self.draft_id = draft_id  # DB record ID (set after first save)
        self._auto_fill()

    def _auto_fill(self):
        """Populate fields the agent can pull from DB context."""
        ctx = self.user_context

        if self.form_type == "occurrence":
            now = datetime.now(timezone.utc).isoformat()
            ref = f"OCC-{datetime.now(timezone.utc).strftime('%Y-%m%d-%H%M')}"
            self.fields["incident_date_time"] = now
            self.fields["badge_number"] = ctx.get("badge_number", "")
            self.fields["report_creator"] = f"{ctx.get('first_name', '')} {ctx.get('last_name', '')}"
            self.fields["creator_details"] = f"Badge {ctx.get('badge_number', '')}"
            self.fields["requested_by"] = self.fields["report_creator"]
            self.fields["requested_by_details"] = self.fields["creator_details"]
            self.fields["role"] = ctx.get("role_type", "Paramedic")
            self.fields["role_description"] = ctx.get("role_type", "Paramedic")
            self.fields["occurrence_reference"] = ref
            # From shift context
            self.fields["service"] = ctx.get("service", "")
            self.fields["vehicle_number"] = ctx.get("vehicle_number", "")
            self.fields["vehicle_description"] = ctx.get("vehicle_description", "")

        elif self.form_type == "teddy_bear":
            self.fields["distribution_timestamp"] = datetime.now(timezone.utc).isoformat()

    @property
    def field_defs(self) -> dict:
        if self.form_type == "occurrence":
            return OCCURRENCE_FIELDS
        return TEDDY_BEAR_FIELDS

    def update_field(self, field_name: str, value) -> bool:
        """Update a field value. Returns True if field exists."""
        if field_name in self.field_defs:
            self.fields[field_name] = value
            return True
        return False

    def get_missing_required(self) -> list[str]:
        """Return list of user-provided required fields not yet filled.
        Auto-filled fields are best-effort — never block submission."""
        missing = []
        for name, meta in self.field_defs.items():
            if not meta["auto"] and meta["required"] and not self.fields.get(name):
                missing.append(name)
        return missing

    def get_next_question_field(self) -> Optional[str]:
        """Return the next user-provided required field to ask about."""
        for name, meta in self.field_defs.items():
            if not meta["auto"] and meta["required"] and not self.fields.get(name):
                return name
        return None

    def get_status(self) -> dict:
        """Return a summary of filled vs missing fields.
        Only shows user-provided fields as missing — auto fields are hidden."""
        filled = {}
        missing = []
        for name, meta in self.field_defs.items():
            if self.fields.get(name):
                filled[name] = {"label": meta["label"], "value": self.fields[name], "auto": meta["auto"]}
            elif not meta["auto"]:
                missing.append({"field": name, "label": meta["label"], "required": meta["required"]})
        complete = self.is_complete()

        total_required = len([k for k, m in self.field_defs.items() if not m["auto"] and m["required"]])
        filled_required = len([k for k, m in self.field_defs.items() if not m["auto"] and m["required"] and self.fields.get(k)])
        completion = round((filled_required / total_required) * 100) if total_required else 0

        result = {
            "form_type": self.form_type,
            "draft_id": self.draft_id,
            "filled": filled,
            "missing": missing,
            "ready_to_submit": complete,
            "completion": completion,
            "status": "Ready to Submit" if complete else "Draft",
        }
        if complete:
            result["instruction"] = "ALL required fields are filled. Call get_form_status to show the summary card, then ask: 'Want me to submit and send it to your supervisor?' Wait for confirmation before calling submit_form."
        return result

    def is_complete(self) -> bool:
        """Complete when all user-provided required fields are filled."""
        return len(self.get_missing_required()) == 0

    def get_prompt_for_field(self, field_name: str) -> str:
        """Return a conversational prompt to ask the user for a field."""
        prompts = {
            "classification": "What type of occurrence is this? (Accident/Injury, Complaint, Equipment Failure, Medication Error, Near Miss, or Other)",
            "occurrence_type": "Can you specify the occurrence category? (Vehicle Collision, Patient Injury, Staff Injury, Equipment Issue, Protocol Deviation, or Other)",
            "call_number": "Do you have a call or dispatch number for this incident?",
            "brief_description": "Can you give me a brief one-line summary of what happened?",
            "description_of_event": "Now, can you describe in detail what you observed during the occurrence?",
            "action_taken": "What immediate actions were taken in response?",
            "suggested_resolution": "Any recommended steps to resolve or prevent this from happening again?",
            "other_services_involved": "Were any other services involved? (Fire Department, Police, or none)",
            "classification_details": "Any additional classification details?",
            "management_notes": "Any notes for supervisory review?",
            "recipient_type": "Who received the teddy bear? (Patient, Family member, Bystander, or Other)",
            "recipient_age": "How old is the recipient?",
            "recipient_gender": "What is the recipient's gender? (Male, Female, Other, or Prefer not to say)",
        }
        return prompts.get(field_name, f"What is the {self.field_defs[field_name]['label']}?")


# ── DB persistence ────────────────────────────────────────────────

def _build_occurrence_data(session: FormSession) -> dict:
    """Build a DB-ready dict for occurrence_reports."""
    ctx = session.user_context
    data = {
        "creator_id": ctx.get("paramedic_id"),
        "shift_id": ctx.get("shift_id"),
        "status": "Draft",
    }
    # Map form fields to DB columns
    for col in OCCURRENCE_DB_COLS:
        if col in ("creator_id", "shift_id", "status"):
            continue
        val = session.fields.get(col)
        if val is not None:
            data[col] = val
    return {k: v for k, v in data.items() if v is not None}


def _build_teddy_bear_data(session: FormSession) -> dict:
    """Build a DB-ready dict for teddy_bear_tracking."""
    ctx = session.user_context
    data = {
        "primary_medic_id": ctx.get("paramedic_id"),
        "secondary_medic_id": ctx.get("partner_paramedic_id"),
        "shift_id": ctx.get("shift_id"),
    }
    for col in TEDDY_BEAR_DB_COLS:
        if col in ("primary_medic_id", "secondary_medic_id", "shift_id"):
            continue
        val = session.fields.get(col)
        if val is not None:
            if col == "recipient_age":
                try:
                    data[col] = int(val)
                except (ValueError, TypeError):
                    pass
            else:
                data[col] = val
    return {k: v for k, v in data.items() if v is not None}


async def create_draft(session: FormSession) -> str:
    """Insert a new Draft row into DB. Returns the record ID."""
    db = get_supabase()

    if session.form_type == "occurrence":
        data = _build_occurrence_data(session)
        result = db.table("occurrence_reports").insert(data).execute()
        record = result.data[0] if result.data else {}
        session.draft_id = record.get("report_id")
    else:
        data = _build_teddy_bear_data(session)
        result = db.table("teddy_bear_tracking").insert(data).execute()
        record = result.data[0] if result.data else {}
        session.draft_id = record.get("tracking_id")

    print(f"[FORM] Created draft {session.form_type}: {session.draft_id}")
    return session.draft_id


async def update_draft(session: FormSession) -> dict:
    """Update the existing Draft row in DB with current field values."""
    if not session.draft_id:
        return {}

    db = get_supabase()

    if session.form_type == "occurrence":
        data = _build_occurrence_data(session)
        result = (
            db.table("occurrence_reports")
            .update(data)
            .eq("report_id", session.draft_id)
            .execute()
        )
    else:
        data = _build_teddy_bear_data(session)
        result = (
            db.table("teddy_bear_tracking")
            .update(data)
            .eq("tracking_id", session.draft_id)
            .execute()
        )

    print(f"[FORM] Updated draft {session.draft_id}")
    return result.data[0] if result.data else {}


async def submit_form(session: FormSession) -> dict:
    """Mark draft as Submitted."""
    if not session.draft_id:
        return {"error": "No draft to submit"}

    db = get_supabase()

    if session.form_type == "occurrence":
        result = (
            db.table("occurrence_reports")
            .update({"status": "Submitted"})
            .eq("report_id", session.draft_id)
            .execute()
        )
        return result.data[0] if result.data else {}
    else:
        # Teddy bear doesn't have a status column, just return the record
        result = (
            db.table("teddy_bear_tracking")
            .select("*")
            .eq("tracking_id", session.draft_id)
            .single()
            .execute()
        )
        return result.data if result.data else {}


async def get_user_drafts(user_id: str) -> dict:
    """Get all Draft forms for a user so they can resume."""
    db = get_supabase()

    # Get paramedic_id for this user
    para = db.table("paramedics").select("paramedic_id").eq("user_id", user_id).single().execute()
    if not para.data:
        return {"occurrence_drafts": [], "teddy_bear_drafts": []}

    paramedic_id = para.data["paramedic_id"]

    # Draft occurrence reports
    occ_result = (
        db.table("occurrence_reports")
        .select("report_id, classification, brief_description, incident_date_time, created_at")
        .eq("creator_id", paramedic_id)
        .eq("status", "Draft")
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "occurrence_drafts": occ_result.data or [],
        "teddy_bear_drafts": [],  # Teddy bear has no status/draft concept
    }


async def resume_draft(draft_id: str, form_type: str, user_context: dict) -> FormSession:
    """Load a draft from DB into a FormSession for resuming."""
    db = get_supabase()
    session = FormSession(form_type, user_context, draft_id=draft_id)

    if form_type == "occurrence":
        result = (
            db.table("occurrence_reports")
            .select("*")
            .eq("report_id", draft_id)
            .single()
            .execute()
        )
        if result.data:
            row = result.data
            for field_name in OCCURRENCE_FIELDS:
                if row.get(field_name):
                    session.fields[field_name] = row[field_name]

    print(f"[FORM] Resumed draft {form_type}: {draft_id}, fields: {list(session.fields.keys())}")
    return session
