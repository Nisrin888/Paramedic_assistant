"""
LangGraph state schema and FormSession serialization helpers.

AgentState is the single state object that flows through the graph.
FormSession is mutable but LangGraph state is immutable, so we
serialize/deserialize it around each tool call.
"""
from typing import Annotated, Optional, TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """Checkpointed conversation state for the LangGraph agent."""

    messages: Annotated[list, add_messages]  # Conversation history
    user_context: dict  # Profile, shift, persona (set once at session start)
    form_session_data: Optional[dict]  # Serialized FormSession (JSON-safe)
    last_submitted_id: Optional[str]
    last_submitted_type: Optional[str]
    action: Optional[str]  # "form_update", "form_submitted", etc.
    action_data: Optional[dict]  # Payload for client UI
    active_agent: Optional[str]  # "occurrence_form", "teddy_bear_form", "checklist", "shift", None
    blocking_items_acknowledged: Optional[bool]  # Form 4 guardrail fired this session?


# ── FormSession serialization ─────────────────────────────────────


def serialize_form_session(session) -> dict:
    """Convert a FormSession into a JSON-safe dict for state storage."""
    if session is None:
        return None
    return {
        "form_type": session.form_type,
        "fields": dict(session.fields),
        "draft_id": session.draft_id,
    }


def deserialize_form_session(data: dict, user_context: dict):
    """Reconstruct a FormSession from serialized dict.

    We import FormSession here to avoid circular imports and because
    this is only called when we actually need to reconstruct.
    """
    if data is None:
        return None
    from app.agents.form_agent import FormSession

    session = FormSession(
        form_type=data["form_type"],
        user_context=user_context,
        draft_id=data.get("draft_id"),
    )
    # Override auto-filled fields with stored values
    session.fields = dict(data.get("fields", {}))
    return session
