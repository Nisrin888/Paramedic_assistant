"""
LangGraph StateGraph — Master Agent Orchestrator for the Paramedic AI Assistant.

Topology:
  START ──▶ [master_orchestrator] ⇄ [agent_tools] ──▶ END

The master orchestrator is a single LLM node with role-filtered tools bound.
It intelligently decides which sub-agent tools to call (Form, Checklist, Shift,
Supervisor) based on the user's message and context.

Tool execution supports both sequential (form mutations) and parallel
(read-only queries) execution via asyncio.gather.
"""
import asyncio
import json
import logging
from typing import Literal

from langchain_openai import ChatOpenAI
from langchain_core.messages import ToolMessage
from langgraph.graph import StateGraph, START, END

from app.config import get_settings
from app.agents.state import AgentState
from app.agents.prompts import build_master_prompt
from app.agents.langgraph_tools import (
    PARAMEDIC_TOOL_LIST,
    SUPERVISOR_TOOL_LIST,
    execute_tool,
)

logger = logging.getLogger(__name__)


# ── LLM setup ────────────────────────────────────────────────────

def _get_llm() -> ChatOpenAI:
    settings = get_settings()
    kwargs = {
        "model": settings.llm_model,
        "temperature": 0,
        "api_key": settings.openrouter_api_key,
    }
    if settings.openrouter_api_base:
        kwargs["base_url"] = settings.openrouter_api_base
    return ChatOpenAI(**kwargs)


_paramedic_llm = None
_supervisor_llm = None


def _ensure_llms():
    """Create and cache role-specific LLM instances with tools bound."""
    global _paramedic_llm, _supervisor_llm
    if _paramedic_llm is None:
        llm = _get_llm()
        _paramedic_llm = llm.bind_tools(PARAMEDIC_TOOL_LIST)
        _supervisor_llm = llm.bind_tools(SUPERVISOR_TOOL_LIST)


def _get_llm_for_role(role: str):
    """Return the cached LLM with the correct tool set bound for this role."""
    _ensure_llms()
    if role == "Supervisor":
        return _supervisor_llm
    return _paramedic_llm


# ═══════════════════════════════════════════════════════════════════
# Graph Nodes
# ═══════════════════════════════════════════════════════════════════

# Tools that mutate form state — must run sequentially
MUTATING_TOOLS = {
    "start_occurrence_report", "start_teddy_bear_form",
    "update_form_field", "submit_form", "resume_form",
    "save_for_later", "send_to_supervisor", "review_report",
}


async def master_orchestrator(state: AgentState) -> dict:
    """The single brain of the system.

    Builds a role-aware, guardrail-enforcing prompt, picks the right
    LLM (with role-filtered tools), and returns the AI response.

    On the initial call (user message just arrived), clears stale
    action/action_data from the previous turn. On subsequent calls
    (after agent_tools), preserves them so the WebSocket can read them.
    """
    user_context = state["user_context"]
    role = user_context.get("role_type", "Paramedic")

    prompt = build_master_prompt(
        user_context=user_context,
        form_session_data=state.get("form_session_data"),
        active_agent=state.get("active_agent"),
        blocking_acknowledged=state.get("blocking_items_acknowledged", False),
    )

    messages = [{"role": "system", "content": prompt}] + state["messages"]
    llm = _get_llm_for_role(role)
    response = await llm.ainvoke(messages)

    # Check if this is the initial call (last message is from user, not tools)
    last_msg = state["messages"][-1] if state["messages"] else None
    is_initial = not isinstance(last_msg, ToolMessage)

    result = {"messages": [response]}
    if is_initial:
        # Clear stale action/action_data from previous turn
        result["action"] = None
        result["action_data"] = None
    # After tools: don't overwrite — let agent_tools values pass through
    return result


async def agent_tools(state: AgentState) -> dict:
    """Execute tool calls from the master orchestrator.

    Supports parallel execution for read-only tools (shift, weather,
    status) and sequential execution for state-mutating tools (form
    operations). When the LLM emits multiple tool calls in one turn,
    read-only tools run concurrently via asyncio.gather.
    """
    last_msg = state["messages"][-1]
    if not hasattr(last_msg, "tool_calls") or not last_msg.tool_calls:
        return {}

    user_context = state["user_context"]
    form_session_data = state.get("form_session_data")
    last_submitted_id = state.get("last_submitted_id")
    last_submitted_type = state.get("last_submitted_type")

    tool_messages = []
    action = None
    action_data = None
    active_agent = state.get("active_agent")

    # Split tool calls by execution mode
    parallel_tcs = [tc for tc in last_msg.tool_calls if tc["name"] not in MUTATING_TOOLS]
    sequential_tcs = [tc for tc in last_msg.tool_calls if tc["name"] in MUTATING_TOOLS]

    # ── Parallel execution for read-only tools ──────────────────
    if parallel_tcs:
        async def _exec_parallel(tc):
            try:
                result = await execute_tool(
                    tc["name"], tc["args"], user_context,
                    form_session_data, last_submitted_id, last_submitted_type,
                )
            except Exception as e:
                logger.error(f"[GRAPH] Tool {tc['name']} failed: {e}")
                result = {"tool_result": {"error": str(e)}}
            return tc, result

        parallel_results = await asyncio.gather(*[_exec_parallel(tc) for tc in parallel_tcs])

        for tc, result in parallel_results:
            tool_content = json.dumps(result.get("tool_result", {}), default=str)
            tool_messages.append(ToolMessage(content=tool_content, tool_call_id=tc["id"]))

            if result.get("action"):
                action = result["action"]
                action_data = result.get("action_data")

            # Track active agent for checklist/shift context
            if tc["name"] == "get_status_check":
                active_agent = "checklist"
            elif tc["name"] in ("get_shift_info", "get_outstanding_items"):
                active_agent = "shift"

    # ── Sequential execution for state-mutating tools ───────────
    for tc in sequential_tcs:
        fn_name = tc["name"]
        fn_args = tc["args"]
        logger.info(f"[GRAPH] Executing tool (sequential): {fn_name}")

        try:
            result = await execute_tool(
                fn_name, fn_args, user_context,
                form_session_data, last_submitted_id, last_submitted_type,
            )
        except Exception as e:
            logger.error(f"[GRAPH] Tool {fn_name} failed: {e}")
            result = {"tool_result": {"error": str(e)}}

        tool_content = json.dumps(result.get("tool_result", {}), default=str)
        tool_messages.append(ToolMessage(content=tool_content, tool_call_id=tc["id"]))

        # Update mutable state between sequential tool calls
        if "form_session_data" in result:
            form_session_data = result["form_session_data"]
        if result.get("action"):
            action = result["action"]
            action_data = result.get("action_data")
        if "last_submitted_id" in result:
            last_submitted_id = result["last_submitted_id"]
        if "last_submitted_type" in result:
            last_submitted_type = result["last_submitted_type"]

    # Track active_agent based on which tools were called
    called_names = {tc["name"] for tc in last_msg.tool_calls}

    if "start_occurrence_report" in called_names:
        active_agent = "occurrence_form"
    elif "start_teddy_bear_form" in called_names:
        active_agent = "teddy_bear_form"
    elif "resume_form" in called_names:
        ft = (form_session_data or {}).get("form_type", "occurrence")
        active_agent = "teddy_bear_form" if ft == "teddy_bear" else "occurrence_form"
    elif "update_form_field" in called_names:
        # Preserve existing form-specific active_agent; infer if not set
        if active_agent not in ("occurrence_form", "teddy_bear_form"):
            ft = (form_session_data or {}).get("form_type", "occurrence")
            active_agent = "teddy_bear_form" if ft == "teddy_bear" else "occurrence_form"
    elif "submit_form" in called_names:
        active_agent = None  # Form completed

    # Track blocking items acknowledgment
    blocking_items_acknowledged = state.get("blocking_items_acknowledged")
    if "get_status_check" in called_names:
        blocking_items_acknowledged = True

    return {
        "messages": tool_messages,
        "form_session_data": form_session_data,
        "action": action,
        "action_data": action_data,
        "last_submitted_id": last_submitted_id,
        "last_submitted_type": last_submitted_type,
        "active_agent": active_agent,
        "blocking_items_acknowledged": blocking_items_acknowledged,
    }


# ── Conditional edge ─────────────────────────────────────────────


def should_continue(state: AgentState) -> Literal["agent_tools", "__end__"]:
    """If the last message has tool_calls, execute them; otherwise end."""
    last_msg = state["messages"][-1]
    if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
        return "agent_tools"
    return "__end__"


# ═══════════════════════════════════════════════════════════════════
# Graph Assembly
# ═══════════════════════════════════════════════════════════════════


def build_graph() -> StateGraph:
    """Construct the 2-node master orchestrator graph."""
    graph = StateGraph(AgentState)

    graph.add_node("master_orchestrator", master_orchestrator)
    graph.add_node("agent_tools", agent_tools)

    graph.add_edge(START, "master_orchestrator")
    graph.add_conditional_edges("master_orchestrator", should_continue)
    graph.add_edge("agent_tools", "master_orchestrator")

    return graph


# ── Compiled graph singleton ─────────────────────────────────────

_compiled_graph = None


async def get_graph():
    """Return a compiled graph with optional PostgreSQL checkpointer.

    If supabase_db_url is configured, uses AsyncPostgresSaver for
    conversation persistence across reconnects. Otherwise runs
    with in-memory checkpointing.
    """
    global _compiled_graph
    if _compiled_graph is not None:
        return _compiled_graph

    graph = build_graph()
    settings = get_settings()

    if settings.supabase_db_url:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        checkpointer = AsyncPostgresSaver.from_conn_string(settings.supabase_db_url)
        await checkpointer.setup()
        _compiled_graph = graph.compile(checkpointer=checkpointer)
        logger.info("[GRAPH] Compiled with PostgreSQL checkpointer")
    else:
        from langgraph.checkpoint.memory import MemorySaver
        _compiled_graph = graph.compile(checkpointer=MemorySaver())
        logger.info("[GRAPH] Compiled with in-memory checkpointer")

    return _compiled_graph
