"""
Audit Service - Logs all AI agent actions and reasoning for compliance.

Every tool call, form change, and AI decision is recorded with:
- Who (user_id, session)
- What (tool called, arguments, result)
- Why (AI reasoning / user message that triggered it)
- When (timestamp, duration)
"""
import json
import time
import uuid
from datetime import datetime, timezone
from app.database import get_supabase


def _safe_json(obj, max_len=5000) -> str:
    """Safely serialize to JSON string, truncating if needed."""
    try:
        s = json.dumps(obj, default=str)
        return s[:max_len] if len(s) > max_len else s
    except Exception:
        return json.dumps({"error": "Could not serialize"})


class AuditLogger:
    """Per-session audit logger. Created once per WebSocket connection."""

    def __init__(self, user_id: str, session_id: str = None):
        self.user_id = user_id
        self.session_id = session_id or str(uuid.uuid4())[:12]
        self.db = get_supabase()

    def _insert(self, record: dict):
        """Fire-and-forget insert. Don't let audit failures break the app."""
        try:
            record["user_id"] = self.user_id
            record["session_id"] = self.session_id
            record["created_at"] = datetime.now(timezone.utc).isoformat()
            self.db.table("audit_log").insert(record).execute()
        except Exception as e:
            print(f"[AUDIT] Write failed: {e}")

    def log_session_start(self, role: str, details: dict = None):
        """Log when a user connects and starts a session."""
        self._insert({
            "action": "session_start",
            "agent_name": "orchestrator",
            "details": {
                "role": role,
                **(details or {}),
            },
        })

    def log_user_message(self, message: str):
        """Log the user's input message."""
        self._insert({
            "action": "user_message",
            "agent_name": "orchestrator",
            "user_message": message[:2000],
        })

    def log_tool_call(
        self,
        tool_name: str,
        tool_args: dict,
        tool_result: dict,
        ai_reasoning: str = None,
        form_id: str = None,
        duration_ms: int = None,
    ):
        """Log an AI tool/function call with full context."""
        self._insert({
            "action": "tool_call",
            "agent_name": "orchestrator",
            "tool_name": tool_name,
            "tool_args": json.loads(_safe_json(tool_args)),
            "tool_result": json.loads(_safe_json(tool_result)),
            "ai_reasoning": ai_reasoning[:2000] if ai_reasoning else None,
            "form_id": form_id,
            "duration_ms": duration_ms,
        })

    def log_form_event(self, event: str, form_type: str, form_id: str = None, details: dict = None):
        """Log form lifecycle events (created, updated, submitted, emailed)."""
        self._insert({
            "action": f"form_{event}",
            "agent_name": "form_agent",
            "tool_name": f"form_{event}",
            "form_id": form_id,
            "details": {
                "form_type": form_type,
                **(details or {}),
            },
        })

    def log_email_sent(self, recipient: str, form_id: str = None, form_type: str = None):
        """Log when a form is emailed to supervisor."""
        self._insert({
            "action": "email_sent",
            "agent_name": "email_service",
            "tool_name": "send_to_supervisor",
            "form_id": form_id,
            "details": {
                "recipient": recipient,
                "form_type": form_type,
            },
        })

    def log_ai_response(self, response_text: str, had_tool_calls: bool = False):
        """Log the AI's final response."""
        self._insert({
            "action": "ai_response",
            "agent_name": "orchestrator",
            "details": {
                "response_preview": response_text[:500],
                "had_tool_calls": had_tool_calls,
            },
        })

    def log_error(self, error: str, context: str = None):
        """Log errors for debugging."""
        self._insert({
            "action": "error",
            "agent_name": "orchestrator",
            "details": {
                "error": str(error)[:1000],
                "context": context,
            },
        })
