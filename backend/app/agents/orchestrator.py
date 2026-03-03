"""
Master Orchestrator — The brain of the Paramedic AI Assistant.

Uses GPT-4o function calling to route user messages to the right sub-agent.
Maintains conversation history and adapts to user persona.
Supports both Paramedic and Supervisor roles with different tool sets.
"""
import json
import logging
import time
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

from app.config import get_settings
from app.services.audit_service import AuditLogger
from app.agents.tools import get_tools_for_role
from app.agents.form_agent import (
    FormSession,
    create_draft,
    update_draft,
    submit_form as submit_form_db,
    get_user_drafts,
    resume_draft,
)
from app.agents.checklist_agent import get_status_check
from app.agents.shift_agent import get_shift_info, get_outstanding_items
from app.services.weather_service import get_current_weather
from app.services.email_service import send_form_email
from app.agents.supervisor_agent import (
    get_team_overview,
    get_submitted_reports,
    review_report,
    get_team_compliance,
    get_shift_summary,
    get_team_insights,
)


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=get_settings().openai_api_key)


def _build_system_prompt(user_context: dict, form_session: FormSession | None) -> str:
    """Build a persona-aware system prompt based on role."""
    name = user_context.get("preferred_name") or user_context.get("first_name", "there")
    style = user_context.get("speaking_style", "Friendly")
    guidance = user_context.get("guidance_level_override", "FULL")
    role = user_context.get("role_type", "Paramedic")

    style_instructions = {
        "Professional": "Respond in a professional, formal tone.",
        "Casual": "Respond in a casual, relaxed conversational tone.",
        "Concise": "Keep responses very short and to the point. Minimal words.",
        "Friendly": "Respond in a warm, friendly, and supportive tone.",
    }

    guidance_instructions = {
        "FULL": "Provide full explanations and guidance when helping.",
        "BRIEF": "Keep guidance brief — just the essentials.",
        "MINIMAL": "Minimal guidance. The user is experienced.",
    }

    if role == "Supervisor":
        return f"""You are the Paramedic AI Assistant — Supervisor Dashboard.
You are speaking with {name}, a supervisor ({user_context.get('title', 'Chief')}).

{style_instructions.get(style, style_instructions['Professional'])}
{guidance_instructions.get(guidance, guidance_instructions['FULL'])}

Your capabilities as a supervisor assistant:
- Show team overview — which paramedics are on shift, their status
- View submitted reports — occurrence reports and teddy bear forms from your team
- Review and approve reports — mark reports as reviewed, add management notes
- Team compliance — Form 4 status for all your paramedics
- Shift summaries — forms completed, teddy bears distributed, outstanding items
- Team insights — trends, patterns, and recommendations

When the supervisor asks about their team, reports, compliance, or summaries, use the appropriate tool.
Present data clearly with names, badge numbers, and key details.
Highlight items that need attention (BAD compliance items, pending reports)."""

    # Paramedic prompt
    form_context = ""
    if form_session:
        status = form_session.get_status()
        filled_names = [f["label"] for f in status["filled"].values()]
        missing_names = [f["label"] for f in status["missing"] if f["required"]]
        form_context = f"""

You are currently helping fill a {form_session.form_type} form.
Fields already filled: {', '.join(filled_names) if filled_names else 'none yet'}
Required fields still missing: {', '.join(missing_names) if missing_names else 'all done!'}
Ask for ONE missing required field at a time conversationally.
IMPORTANT: When all required fields are filled, you MUST:
1. Show a clear summary of ALL the form fields and their values
2. Ask "Should I submit this?" and wait for confirmation
3. ONLY call submit_form after the user explicitly confirms (e.g. "yes", "submit", "looks good")
Never skip the confirmation step."""

    return f"""You are the Paramedic AI Assistant for EMS documentation.
You are speaking with {name}, a paramedic.

{style_instructions.get(style, style_instructions['Friendly'])}
{guidance_instructions.get(guidance, guidance_instructions['FULL'])}

Your capabilities:
- Help fill Occurrence Reports (incident documentation)
- Help fill Teddy Bear Comfort Program tracking forms
- Check Form 4 status / compliance checklist
- Provide shift information and partner details
- Track outstanding items
- Get current weather conditions and road safety warnings

When the user describes an incident or event, use the appropriate tool to start a form.
When the user provides information for a form being filled, use update_form_field.
When asked about status or readiness, use get_status_check.
When asked about their shift, partner, or vehicle, use get_shift_info.
When asked about weather or road conditions, use get_weather.

Auto-filled fields (badge, name, vehicle, service, time) are already populated — don't ask for them.
Only ask about fields the user needs to provide.
{form_context}"""


class OrchestratorSession:
    """Manages a conversation session with one user."""

    def __init__(self, user_context: dict):
        self.user_context = user_context
        self.messages: list[dict] = []
        self.form_session: FormSession | None = None
        self.last_submitted_id: str | None = None
        self.last_submitted_type: str | None = None
        self.client = _get_client()
        self.role = user_context.get("role_type", "Paramedic")
        self.audit = AuditLogger(user_context["user_id"])
        self.audit.log_session_start(self.role, {
            "name": user_context.get("preferred_name") or user_context.get("first_name"),
        })

    def _serialize_assistant_message(self, message) -> dict:
        """Safely serialize an assistant message for conversation history."""
        msg = {"role": "assistant"}
        if message.content:
            msg["content"] = message.content
        if message.tool_calls:
            msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments or "{}",
                    },
                }
                for tc in message.tool_calls
            ]
        return msg

    async def handle_message(self, user_text: str) -> dict:
        """Process a user message and return the AI response + any actions."""
        self.messages.append({"role": "user", "content": user_text})
        self.audit.log_user_message(user_text)

        system_prompt = _build_system_prompt(self.user_context, self.form_session)
        tools = get_tools_for_role(self.role)

        try:
            print(f"[ORCH] Calling GPT-4o with {len(self.messages)} messages...")
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": system_prompt}] + self.messages,
                tools=tools,
                tool_choice="auto",
            )
            print(f"[ORCH] GPT-4o responded. Has tool_calls: {bool(response.choices[0].message.tool_calls)}")
        except Exception as e:
            print(f"[ORCH] GPT-4o call FAILED: {e}")
            self.audit.log_error(str(e), "gpt4o_call")
            return {"text": f"Sorry, I encountered an error: {e}", "action": None, "data": None}

        message = response.choices[0].message
        action = None
        action_data = None

        # Capture AI reasoning (text before tool calls)
        ai_reasoning = message.content

        # Handle tool calls
        if message.tool_calls:
            serialized = self._serialize_assistant_message(message)
            print(f"[ORCH] Serialized assistant message: {json.dumps(serialized, default=str)[:200]}")
            self.messages.append(serialized)

            for tool_call in message.tool_calls:
                fn_name = tool_call.function.name
                print(f"[ORCH] Executing tool: {fn_name}")
                try:
                    fn_args = json.loads(tool_call.function.arguments) if tool_call.function.arguments else {}
                except json.JSONDecodeError:
                    fn_args = {}

                t_start = time.time()
                try:
                    result = await self._execute_tool(fn_name, fn_args)
                    print(f"[ORCH] Tool {fn_name} succeeded")
                except Exception as e:
                    print(f"[ORCH] Tool {fn_name} FAILED: {e}")
                    import traceback
                    traceback.print_exc()
                    result = {"tool_result": {"error": str(e)}}
                    self.audit.log_error(str(e), f"tool_{fn_name}")
                duration_ms = int((time.time() - t_start) * 1000)

                # Audit: log every tool call
                form_id = None
                if self.form_session and self.form_session.draft_id:
                    form_id = self.form_session.draft_id
                elif self.last_submitted_id:
                    form_id = self.last_submitted_id

                self.audit.log_tool_call(
                    tool_name=fn_name,
                    tool_args=fn_args,
                    tool_result=result.get("tool_result", {}),
                    ai_reasoning=ai_reasoning,
                    form_id=form_id,
                    duration_ms=duration_ms,
                )

                try:
                    tool_content = json.dumps(result.get("tool_result", {}), default=str)
                    print(f"[ORCH] Serialized tool result: {tool_content[:200]}")
                except Exception as e:
                    print(f"[ORCH] JSON serialize FAILED: {e}")
                    tool_content = json.dumps({"error": "Failed to serialize result"})

                self.messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_content,
                })

                if result.get("action"):
                    action = result["action"]
                    action_data = result.get("data")

            # Rebuild system prompt -- form_session may have been created by a tool call
            system_prompt = _build_system_prompt(self.user_context, self.form_session)

            # Get the final text response after tool execution
            try:
                print(f"[ORCH] Calling GPT-4o follow-up with {len(self.messages)} messages...")
                follow_up = await self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "system", "content": system_prompt}] + self.messages,
                )
                assistant_text = follow_up.choices[0].message.content or ""
                print(f"[ORCH] Follow-up response: {assistant_text[:100]}")
            except Exception as e:
                print(f"[ORCH] Follow-up call FAILED: {e}")
                import traceback
                traceback.print_exc()
                assistant_text = f"Sorry, I encountered an error: {e}"
                self.audit.log_error(str(e), "gpt4o_followup")

            self.messages.append({"role": "assistant", "content": assistant_text})
        else:
            assistant_text = message.content or ""
            self.messages.append({"role": "assistant", "content": assistant_text})

        # Audit: log AI response
        self.audit.log_ai_response(assistant_text, had_tool_calls=bool(message.tool_calls))

        return {
            "text": assistant_text,
            "action": action,
            "data": action_data,
        }

    async def _execute_tool(self, fn_name: str, fn_args: dict) -> dict:
        """Execute a tool call and return the result."""

        # ── Paramedic tools ────────────────────────────────
        if fn_name == "start_occurrence_report":
            self.form_session = FormSession("occurrence", self.user_context)
            for key, val in fn_args.items():
                self.form_session.update_field(key, val)
            await create_draft(self.form_session)
            self.audit.log_form_event("created", "occurrence", self.form_session.draft_id, {"initial_fields": list(fn_args.keys())})
            status = self.form_session.get_status()
            return {"tool_result": status, "action": "form_update", "data": status}

        elif fn_name == "start_teddy_bear_form":
            self.form_session = FormSession("teddy_bear", self.user_context)
            for key, val in fn_args.items():
                self.form_session.update_field(key, val)
            await create_draft(self.form_session)
            self.audit.log_form_event("created", "teddy_bear", self.form_session.draft_id, {"initial_fields": list(fn_args.keys())})
            status = self.form_session.get_status()
            return {"tool_result": status, "action": "form_update", "data": status}

        elif fn_name == "update_form_field":
            if not self.form_session:
                return {"tool_result": {"error": "No form in progress"}}
            self.form_session.update_field(fn_args["field_name"], fn_args["field_value"])
            await update_draft(self.form_session)
            status = self.form_session.get_status()
            return {"tool_result": status, "action": "form_update", "data": status}

        elif fn_name == "get_form_status":
            if not self.form_session:
                return {"tool_result": {"error": "No form in progress"}}
            return {"tool_result": self.form_session.get_status()}

        elif fn_name == "submit_form":
            if not self.form_session:
                return {"tool_result": {"error": "No form in progress"}}
            if not self.form_session.is_complete():
                missing = self.form_session.get_missing_required()
                return {"tool_result": {"error": f"Missing required fields: {missing}"}}
            self.last_submitted_type = self.form_session.form_type
            self.last_submitted_id = self.form_session.draft_id
            saved = await submit_form_db(self.form_session)
            self.form_session = None
            id_key = "report_id" if self.last_submitted_type == "occurrence" else "tracking_id"
            if not self.last_submitted_id and saved:
                self.last_submitted_id = saved.get(id_key)
            self.audit.log_form_event("submitted", self.last_submitted_type, self.last_submitted_id)
            return {"tool_result": {"success": True, "form_id": self.last_submitted_id, "form_type": self.last_submitted_type, "record": saved}, "action": "form_submitted", "data": saved}

        elif fn_name == "get_drafts":
            result = await get_user_drafts(self.user_context["user_id"])
            return {"tool_result": result}

        elif fn_name == "resume_form":
            draft_id = fn_args["draft_id"]
            form_type = fn_args.get("form_type", "occurrence")
            self.form_session = await resume_draft(draft_id, form_type, self.user_context)
            status = self.form_session.get_status()
            return {"tool_result": status, "action": "form_update", "data": status}

        elif fn_name == "get_status_check":
            result = await get_status_check(self.user_context["user_id"])
            return {"tool_result": result, "action": "status_check", "data": result}

        elif fn_name == "get_shift_info":
            result = await get_shift_info(self.user_context.get("paramedic_id", ""))
            return {"tool_result": result, "action": "shift_info", "data": result}

        elif fn_name == "get_outstanding_items":
            result = await get_outstanding_items(self.user_context["user_id"])
            return {"tool_result": result}

        elif fn_name == "get_weather":
            lat = fn_args.get("lat", 43.7)  # Default Toronto area
            lon = fn_args.get("lon", -79.4)
            result = await get_current_weather(lat, lon)
            return {"tool_result": result, "action": "weather", "data": result}

        elif fn_name == "save_for_later":
            from app.database import get_supabase
            db = get_supabase()
            item = {
                "user_id": self.user_context["user_id"],
                "shift_id": self.user_context.get("shift_id"),
                "title": fn_args.get("title", "Saved form draft"),
                "description": json.dumps(self.form_session.fields) if self.form_session else "",
                "category": "form",
                "priority": "medium",
                "status": "pending",
            }
            db.table("outstanding_items").insert(item).execute()
            self.form_session = None
            return {"tool_result": {"success": True, "message": "Saved for later"}}

        elif fn_name == "send_to_supervisor":
            from app.database import get_supabase
            db = get_supabase()

            form_id = fn_args.get("form_id") or self.last_submitted_id
            form_type = fn_args.get("form_type") or self.last_submitted_type or "occurrence"
            if not form_id:
                return {"tool_result": {"error": "No form to send. Submit a form first."}}
            table = "occurrence_reports" if form_type == "occurrence" else "teddy_bear_tracking"
            id_col = "report_id" if form_type == "occurrence" else "tracking_id"

            # Get form data
            form_result = db.table(table).select("*").eq(id_col, form_id).single().execute()
            if not form_result.data:
                return {"tool_result": {"error": "Form not found"}}

            # Look up supervisor email
            para_id = self.user_context.get("paramedic_id", "")
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
            self.audit.log_email_sent(sup_email, form_id, form_type)
            return {"tool_result": email_result, "action": "email_sent", "data": email_result}

        # ── Supervisor tools ───────────────────────────────
        elif fn_name == "get_team_overview":
            result = await get_team_overview(self.user_context["supervisor_id"])
            return {"tool_result": result, "action": "team_overview", "data": result}

        elif fn_name == "get_submitted_reports":
            result = await get_submitted_reports(
                self.user_context["supervisor_id"],
                paramedic_name=fn_args.get("paramedic_name"),
                status_filter=fn_args.get("status_filter", "Submitted"),
            )
            return {"tool_result": result, "action": "submitted_reports", "data": result}

        elif fn_name == "review_report":
            result = await review_report(
                fn_args["report_id"],
                management_notes=fn_args.get("management_notes"),
            )
            return {"tool_result": result, "action": "report_reviewed", "data": result}

        elif fn_name == "get_team_compliance":
            result = await get_team_compliance(self.user_context["supervisor_id"])
            return {"tool_result": result, "action": "team_compliance", "data": result}

        elif fn_name == "get_shift_summary":
            result = await get_shift_summary(
                self.user_context["supervisor_id"],
                shift_id=fn_args.get("shift_id"),
            )
            return {"tool_result": result, "action": "shift_summary", "data": result}

        elif fn_name == "get_team_insights":
            result = await get_team_insights(self.user_context["supervisor_id"])
            return {"tool_result": result, "action": "team_insights", "data": result}

        return {"tool_result": {"error": f"Unknown tool: {fn_name}"}}
