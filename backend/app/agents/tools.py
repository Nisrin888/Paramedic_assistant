"""
OpenAI function/tool definitions for the Master Orchestrator.
These define what actions the AI can take via function calling.
"""

PARAMEDIC_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "start_occurrence_report",
            "description": (
                "Start filling an EMS Occurrence Report. Call this when the paramedic "
                "describes an incident, accident, complaint, or anything that needs to be documented. "
                "Pass any fields the user has already mentioned. The agent will auto-fill "
                "fields it can pull from the database (badge, name, shift, vehicle, service)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "classification": {
                        "type": "string",
                        "enum": [
                            "Accident/Injury", "Complaint", "Equipment Failure",
                            "Medication Error", "Near Miss", "Other",
                        ],
                        "description": "Type of occurrence",
                    },
                    "occurrence_type": {
                        "type": "string",
                        "enum": [
                            "Vehicle Collision", "Patient Injury", "Staff Injury",
                            "Equipment Issue", "Protocol Deviation", "Other",
                        ],
                        "description": "Specific occurrence category",
                    },
                    "call_number": {
                        "type": "string",
                        "description": "Call/dispatch number if mentioned (e.g. 2026-00412)",
                    },
                    "brief_description": {
                        "type": "string",
                        "description": "Short summary of what happened",
                    },
                    "description_of_event": {
                        "type": "string",
                        "description": "Detailed description of what was observed",
                    },
                    "action_taken": {
                        "type": "string",
                        "description": "Immediate actions taken in response",
                    },
                    "suggested_resolution": {
                        "type": "string",
                        "description": "Recommended steps to resolve or prevent recurrence",
                    },
                    "other_services_involved": {
                        "type": "array",
                        "items": {"type": "string", "enum": ["Fire Department", "Police"]},
                        "description": "Other services involved in the incident",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "start_teddy_bear_form",
            "description": (
                "Start filling a Teddy Bear Comfort Program tracking form. Call this when "
                "the paramedic mentions giving a teddy bear to a patient, family member, or bystander."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "recipient_type": {
                        "type": "string",
                        "enum": ["Patient", "Family", "Bystander", "Other"],
                        "description": "Who received the teddy bear",
                    },
                    "recipient_age": {
                        "type": "integer",
                        "description": "Age of the recipient",
                    },
                    "recipient_gender": {
                        "type": "string",
                        "enum": ["Male", "Female", "Other", "Prefer not to say"],
                        "description": "Gender of the recipient",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_form_field",
            "description": (
                "Update a specific field on the form currently being filled. "
                "Call this when the user provides a value for a missing field."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "field_name": {
                        "type": "string",
                        "description": "The field to update",
                    },
                    "field_value": {
                        "type": "string",
                        "description": "The value to set",
                    },
                },
                "required": ["field_name", "field_value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "submit_form",
            "description": (
                "Submit the current form after user confirmation. "
                "Only call this when all required fields are filled and the user has confirmed."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_form_status",
            "description": "Get the current status of the form being filled — shows which fields are filled and which are still missing.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_status_check",
            "description": (
                "Get the Form 4 status check — shows compliance items (GOOD/BAD/UNKNOWN) "
                "and provides guidance steps for any BAD items. Call when the user asks about "
                "their status, checklist, or readiness."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_shift_info",
            "description": "Get current shift information including partner, station, vehicle, and time.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_outstanding_items",
            "description": "Get list of outstanding/pending items that need attention this shift.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": (
                "Get current weather conditions and road safety warnings. "
                "Call this when the user asks about weather, road conditions, or during pre-shift briefing."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {
                        "type": "number",
                        "description": "Latitude (default: station area)",
                    },
                    "lon": {
                        "type": "number",
                        "description": "Longitude (default: station area)",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_drafts",
            "description": (
                "Get the user's draft forms that were saved but not submitted. "
                "Call this when the user asks about unfinished forms or wants to resume."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "resume_form",
            "description": (
                "Resume filling a previously saved draft form. "
                "Call this when the user wants to continue an unfinished form."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "draft_id": {
                        "type": "string",
                        "description": "The report_id of the draft to resume",
                    },
                    "form_type": {
                        "type": "string",
                        "enum": ["occurrence", "teddy_bear"],
                        "description": "Type of form (default: occurrence)",
                    },
                },
                "required": ["draft_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_for_later",
            "description": "Save current form as a draft / outstanding item to complete later.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Brief title for the saved item",
                    },
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_to_supervisor",
            "description": (
                "Send a submitted form (occurrence report or teddy bear) to the supervisor via email "
                "with PDF and XML attachments. Call this when the user asks to send, email, or forward "
                "a form to their supervisor. Works for any form type."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "form_id": {
                        "type": "string",
                        "description": "The ID of the form to send. Use the draft_id from the most recently submitted form.",
                    },
                    "form_type": {
                        "type": "string",
                        "enum": ["occurrence", "teddy_bear"],
                        "description": "Type of form to send",
                    },
                },
                "required": ["form_id", "form_type"],
            },
        },
    },
]

SUPERVISOR_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_team_overview",
            "description": (
                "Get an overview of all paramedics under this supervisor — "
                "who is on shift, their compliance status, and recent activity."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_submitted_reports",
            "description": (
                "Get all occurrence reports and teddy bear forms submitted by paramedics "
                "that are pending supervisor review. Optionally filter by paramedic name."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "paramedic_name": {
                        "type": "string",
                        "description": "Optional: filter by paramedic first or last name",
                    },
                    "status_filter": {
                        "type": "string",
                        "enum": ["Draft", "Submitted", "Reviewed"],
                        "description": "Filter by form status (default: Submitted)",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "review_report",
            "description": (
                "Mark an occurrence report as reviewed and optionally add management notes. "
                "Call this when the supervisor approves or reviews a report."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "report_id": {
                        "type": "string",
                        "description": "UUID of the occurrence report to review",
                    },
                    "management_notes": {
                        "type": "string",
                        "description": "Supervisor notes or feedback on the report",
                    },
                },
                "required": ["report_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_team_compliance",
            "description": (
                "Get Form 4 compliance status for all paramedics under this supervisor. "
                "Shows who has BAD or UNKNOWN items that need attention."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_shift_summary",
            "description": (
                "Get a summary of a specific shift or today's shifts — "
                "calls handled, forms completed, teddy bears distributed, outstanding items."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "shift_id": {
                        "type": "string",
                        "description": "Optional: specific shift UUID. If omitted, shows today's shifts.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_team_insights",
            "description": (
                "Get AI-generated insights about the team — trends in occurrence types, "
                "compliance patterns, teddy bear distribution stats, and recommendations."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
]


def get_tools_for_role(role: str) -> list:
    """Return the appropriate tool set based on user role."""
    if role == "Supervisor":
        return SUPERVISOR_TOOLS
    return PARAMEDIC_TOOLS
