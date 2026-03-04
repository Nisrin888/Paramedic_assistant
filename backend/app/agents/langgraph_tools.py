"""
LangGraph tool definitions and shared execution dispatcher.

Two parts:
  1. @tool-decorated stub functions — used ONLY for llm.bind_tools() schema generation.
     These are never invoked directly by ToolNode.
  2. execute_tool() — the shared dispatcher that both graph.py (custom tool node)
     and realtime.py call. It routes to existing agent functions and returns
     structured results including state updates.
"""
import json
import logging
from typing import Optional

from langchain_core.tools import tool

from app.agents.form_agent import (
    FormSession,
    create_draft,
    update_draft,
    submit_form as submit_form_db,
    get_user_drafts,
    resume_draft,
)
from app.agents.checklist_agent import get_status_check as _get_status_check
from app.agents.shift_agent import (
    get_shift_info as _get_shift_info,
    get_outstanding_items as _get_outstanding_items,
)
from app.agents.supervisor_agent import (
    get_team_overview as _get_team_overview,
    get_submitted_reports as _get_submitted_reports,
    review_report as _review_report,
    get_team_compliance as _get_team_compliance,
    get_shift_summary as _get_shift_summary,
    get_team_insights as _get_team_insights,
)
from app.services.weather_service import get_current_weather
from app.services.email_service import send_form_email
from app.agents.state import serialize_form_session, deserialize_form_session

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════
# Part 1: @tool stubs for LLM schema binding
# These provide the JSON schemas that GPT-4o sees. They are never
# called directly — execution goes through execute_tool() below.
# ═══════════════════════════════════════════════════════════════════


@tool
async def start_occurrence_report(
    classification: Optional[str] = None,
    occurrence_type: Optional[str] = None,
    call_number: Optional[str] = None,
    brief_description: Optional[str] = None,
    description_of_event: Optional[str] = None,
    action_taken: Optional[str] = None,
    suggested_resolution: Optional[str] = None,
    other_services_involved: Optional[list[str]] = None,
) -> str:
    """Start filling an EMS Occurrence Report. Call this when the paramedic describes an incident, accident, complaint, or anything that needs to be documented. Pass any fields the user has already mentioned. The agent will auto-fill fields it can pull from the database (badge, name, shift, vehicle, service)."""
    return ""


@tool
async def start_teddy_bear_form(
    recipient_type: Optional[str] = None,
    recipient_age: Optional[int] = None,
    recipient_gender: Optional[str] = None,
) -> str:
    """Start filling a Teddy Bear Comfort Program tracking form. Call this when the paramedic mentions giving a teddy bear to a patient, family member, or bystander."""
    return ""


@tool
async def update_form_field(field_name: str, field_value: str) -> str:
    """Update a specific field on the form currently being filled. Call this when the user provides a value for a missing field."""
    return ""


@tool
async def submit_form() -> str:
    """Submit the current form after user confirmation. Only call this when all required fields are filled and the user has confirmed."""
    return ""


@tool
async def get_form_status() -> str:
    """Get the current status of the form being filled — shows which fields are filled and which are still missing."""
    return ""


@tool
async def get_status_check() -> str:
    """Get the Form 4 status check — shows compliance items (GOOD/BAD/UNKNOWN) and provides guidance steps for any BAD items. Call when the user asks about their status, checklist, or readiness."""
    return ""


@tool
async def get_shift_info() -> str:
    """Get current shift information including partner, station, vehicle, and time."""
    return ""


@tool
async def get_outstanding_items() -> str:
    """Get list of outstanding/pending items that need attention this shift."""
    return ""


@tool
async def get_weather(lat: Optional[float] = None, lon: Optional[float] = None) -> str:
    """Get current weather conditions and road safety warnings. Call this when the user asks about weather, road conditions, or during pre-shift briefing."""
    return ""


@tool
async def get_drafts() -> str:
    """Get the user's draft forms that were saved but not submitted. Call this when the user asks about unfinished forms or wants to resume."""
    return ""


@tool
async def resume_form(draft_id: str, form_type: Optional[str] = None) -> str:
    """Resume filling a previously saved draft form. Call this when the user wants to continue an unfinished form."""
    return ""


@tool
async def save_for_later(title: str) -> str:
    """Save current form as a draft / outstanding item to complete later."""
    return ""


@tool
async def send_to_supervisor(form_id: str, form_type: str) -> str:
    """Send a submitted form (occurrence report or teddy bear) to the supervisor via email with PDF and XML attachments. Call this when the user asks to send, email, or forward a form to their supervisor. Works for any form type."""
    return ""


# ── Supervisor tool stubs ────────────────────────────────────────


@tool
async def get_team_overview() -> str:
    """Get an overview of all paramedics under this supervisor — who is on shift, their compliance status, and recent activity."""
    return ""


@tool
async def get_submitted_reports(
    paramedic_name: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> str:
    """Get all occurrence reports and teddy bear forms submitted by paramedics that are pending supervisor review. Optionally filter by paramedic name."""
    return ""


@tool
async def review_report(
    report_id: str,
    management_notes: Optional[str] = None,
) -> str:
    """Mark an occurrence report as reviewed and optionally add management notes. Call this when the supervisor approves or reviews a report."""
    return ""


@tool
async def get_team_compliance() -> str:
    """Get Form 4 compliance status for all paramedics under this supervisor. Shows who has BAD or UNKNOWN items that need attention."""
    return ""


@tool
async def get_shift_summary(shift_id: Optional[str] = None) -> str:
    """Get a summary of a specific shift or today's shifts — calls handled, forms completed, teddy bears distributed, outstanding items."""
    return ""


@tool
async def get_team_insights() -> str:
    """Get AI-generated insights about the team — trends in occurrence types, compliance patterns, teddy bear distribution stats, and recommendations."""
    return ""


# ═══════════════════════════════════════════════════════════════════
# Part 2: Tool lists for LLM binding
# ═══════════════════════════════════════════════════════════════════

PARAMEDIC_TOOL_LIST = [
    start_occurrence_report,
    start_teddy_bear_form,
    update_form_field,
    get_form_status,
    submit_form,
    get_drafts,
    resume_form,
    get_status_check,
    get_shift_info,
    get_outstanding_items,
    get_weather,
    save_for_later,
    send_to_supervisor,
]

SUPERVISOR_TOOL_LIST = [
    get_team_overview,
    get_submitted_reports,
    review_report,
    get_team_compliance,
    get_shift_summary,
    get_team_insights,
]


# ═══════════════════════════════════════════════════════════════════
# Part 3: Shared tool execution dispatcher
# Used by graph.py (custom tool nodes) and realtime.py
#
# Returns dict with keys:
#   tool_result       — the data to show the LLM / send to OpenAI
#   form_session_data — updated serialized FormSession (or None)
#   action            — UI action string (or None)
#   action_data       — UI action payload (or None)
#   last_submitted_id — set when a form is submitted
#   last_submitted_type — set when a form is submitted
# ═══════════════════════════════════════════════════════════════════


async def execute_tool(
    fn_name: str,
    fn_args: dict,
    user_context: dict,
    form_session_data: dict | None,
    last_submitted_id: str | None = None,
    last_submitted_type: str | None = None,
) -> dict:
    """Execute a tool call and return structured results.

    This is the single source of truth for tool execution, shared by
    the LangGraph text-chat graph and the Realtime voice proxy.
    """

    # ── Paramedic: Form tools ────────────────────────────────────

    if fn_name == "start_occurrence_report":
        session = FormSession("occurrence", user_context)
        for k, v in fn_args.items():
            if v is not None:
                session.update_field(k, v)
        await create_draft(session)
        status = session.get_status()
        return {
            "tool_result": status,
            "form_session_data": serialize_form_session(session),
            "action": "form_update",
            "action_data": status,
        }

    if fn_name == "start_teddy_bear_form":
        session = FormSession("teddy_bear", user_context)
        for k, v in fn_args.items():
            if v is not None:
                session.update_field(k, v)
        await create_draft(session)
        status = session.get_status()
        return {
            "tool_result": status,
            "form_session_data": serialize_form_session(session),
            "action": "form_update",
            "action_data": status,
        }

    if fn_name == "update_form_field":
        if not form_session_data:
            return {"tool_result": {"error": "No form in progress"}}
        session = deserialize_form_session(form_session_data, user_context)
        session.update_field(fn_args["field_name"], fn_args["field_value"])
        await update_draft(session)
        status = session.get_status()
        return {
            "tool_result": status,
            "form_session_data": serialize_form_session(session),
            "action": "form_update",
            "action_data": status,
        }

    if fn_name == "get_form_status":
        if not form_session_data:
            return {"tool_result": {"error": "No form in progress"}}
        session = deserialize_form_session(form_session_data, user_context)
        status = session.get_status()
        return {
            "tool_result": status,
            "action": "form_update",
            "action_data": status,
        }

    if fn_name == "submit_form":
        if not form_session_data:
            return {"tool_result": {"error": "No form in progress"}}
        session = deserialize_form_session(form_session_data, user_context)
        if not session.is_complete():
            missing = session.get_missing_required()
            return {"tool_result": {"error": f"Missing required fields: {missing}"}}
        sub_type = session.form_type
        sub_id = session.draft_id
        saved = await submit_form_db(session)
        id_key = "report_id" if sub_type == "occurrence" else "tracking_id"
        if not sub_id and saved:
            sub_id = saved.get(id_key)
        return {
            "tool_result": {"success": True, "form_id": sub_id, "form_type": sub_type, "record": saved},
            "form_session_data": None,
            "action": "form_submitted",
            "action_data": saved,
            "last_submitted_id": sub_id,
            "last_submitted_type": sub_type,
        }

    if fn_name == "get_drafts":
        result = await get_user_drafts(user_context["user_id"])
        return {"tool_result": result}

    if fn_name == "resume_form":
        draft_id = fn_args["draft_id"]
        form_type = fn_args.get("form_type") or "occurrence"
        session = await resume_draft(draft_id, form_type, user_context)
        status = session.get_status()
        return {
            "tool_result": status,
            "form_session_data": serialize_form_session(session),
            "action": "form_update",
            "action_data": status,
        }

    if fn_name == "save_for_later":
        from app.database import get_supabase
        db = get_supabase()
        draft_id = None
        form_type = None
        description = ""
        if form_session_data:
            draft_id = form_session_data.get("draft_id")
            form_type = form_session_data.get("form_type")
            description = json.dumps({
                "draft_id": draft_id,
                "form_type": form_type,
                "fields": form_session_data.get("fields", {}),
            })
        item = {
            "user_id": user_context["user_id"],
            "shift_id": user_context.get("shift_id"),
            "title": fn_args.get("title", "Saved form draft"),
            "description": description,
            "category": "form",
            "priority": "medium",
            "status": "pending",
        }
        db.table("outstanding_items").insert(item).execute()
        return {
            "tool_result": {
                "success": True,
                "message": "Saved for later",
                "draft_id": draft_id,
                "form_type": form_type,
            },
            "form_session_data": None,
        }

    if fn_name == "send_to_supervisor":
        from app.database import get_supabase
        db = get_supabase()

        form_id = fn_args.get("form_id") or last_submitted_id
        form_type = fn_args.get("form_type") or last_submitted_type or "occurrence"
        if not form_id:
            return {"tool_result": {"error": "No form to send. Submit a form first."}}
        table = "occurrence_reports" if form_type == "occurrence" else "teddy_bear_tracking"
        id_col = "report_id" if form_type == "occurrence" else "tracking_id"

        form_result = db.table(table).select("*").eq(id_col, form_id).single().execute()
        if not form_result.data:
            return {"tool_result": {"error": "Form not found"}}

        para_id = user_context.get("paramedic_id", "")
        sup_email = None
        mapping = db.table("supervisor_mappings").select("supervisor_id").eq("paramedic_id", para_id).limit(1).execute()
        if mapping.data:
            sup = db.table("supervisors").select("user_id").eq("supervisor_id", mapping.data[0]["supervisor_id"]).single().execute()
            if sup.data:
                sup_user = db.table("users").select("email").eq("user_id", sup.data["user_id"]).single().execute()
                if sup_user.data:
                    sup_email = sup_user.data["email"]

        if not sup_email:
            return {"tool_result": {"error": "Supervisor email not found"}}

        ref = form_result.data.get("occurrence_reference", form_id[:8])
        subject = f"Occurrence Report - {ref}" if form_type == "occurrence" else f"Teddy Bear Tracking - {form_id[:8]}"
        ft = "occurrence" if form_type == "occurrence" else "teddy_bear"

        email_result = await send_form_email(sup_email, subject, form_result.data, ft)
        return {"tool_result": email_result, "action": "email_sent", "action_data": email_result}

    # ── Paramedic: Info tools ────────────────────────────────────

    if fn_name == "get_status_check":
        result = await _get_status_check(user_context["user_id"])
        return {"tool_result": result, "action": "status_check", "action_data": result}

    if fn_name == "get_shift_info":
        result = await _get_shift_info(user_context.get("paramedic_id", ""))
        return {"tool_result": result, "action": "shift_info", "action_data": result}

    if fn_name == "get_outstanding_items":
        result = await _get_outstanding_items(user_context["user_id"])
        return {"tool_result": result}

    if fn_name == "get_weather":
        lat = fn_args.get("lat", 43.7)
        lon = fn_args.get("lon", -79.4)
        result = await get_current_weather(lat, lon)
        return {"tool_result": result, "action": "weather", "action_data": result}

    # ── Supervisor tools ─────────────────────────────────────────

    if fn_name == "get_team_overview":
        result = await _get_team_overview(user_context["supervisor_id"])
        return {"tool_result": result, "action": "team_overview", "action_data": result}

    if fn_name == "get_submitted_reports":
        result = await _get_submitted_reports(
            user_context["supervisor_id"],
            paramedic_name=fn_args.get("paramedic_name"),
            status_filter=fn_args.get("status_filter", "Submitted"),
        )
        return {"tool_result": result, "action": "submitted_reports", "action_data": result}

    if fn_name == "review_report":
        result = await _review_report(
            fn_args["report_id"],
            management_notes=fn_args.get("management_notes"),
        )
        return {"tool_result": result, "action": "report_reviewed", "action_data": result}

    if fn_name == "get_team_compliance":
        result = await _get_team_compliance(user_context["supervisor_id"])
        return {"tool_result": result, "action": "team_compliance", "action_data": result}

    if fn_name == "get_shift_summary":
        result = await _get_shift_summary(
            user_context["supervisor_id"],
            shift_id=fn_args.get("shift_id"),
        )
        return {"tool_result": result, "action": "shift_summary", "action_data": result}

    if fn_name == "get_team_insights":
        result = await _get_team_insights(user_context["supervisor_id"])
        return {"tool_result": result, "action": "team_insights", "action_data": result}

    return {"tool_result": {"error": f"Unknown tool: {fn_name}"}}
