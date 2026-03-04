"""
OpenAI Realtime API WebSocket proxy.

Client (React Native) <-> Our Backend <-> OpenAI Realtime API

The backend:
  - Authenticates the user
  - Opens a WebSocket to OpenAI's Realtime API
  - Configures the session with our tools + user persona
  - Forwards audio bidirectionally
  - Intercepts function calls to execute our tools (form filling, status, etc.)
  - Returns tool results to OpenAI so it continues the conversation

Tool execution is shared with the LangGraph text-chat agent via
langgraph_tools.execute_tool() — no duplicated logic.
"""
import asyncio
import json
import logging
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError
import websockets

from app.config import get_settings
from app.database import get_supabase
from app.agents.langgraph_tools import execute_tool
from app.agents.prompts import build_realtime_instructions
from app.agents.state import serialize_form_session

logger = logging.getLogger(__name__)
router = APIRouter(tags=["realtime"])

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"

# Voice mapping for Realtime API
REALTIME_VOICE_MAP = {
    "Female": "shimmer",
    "Male": "ash",
}


def _build_realtime_tools(role: str) -> list:
    """Build tool definitions in Realtime API format (needs 'type' at top level)."""
    if role == "Supervisor":
        from app.agents.tools import SUPERVISOR_TOOLS
        tools = SUPERVISOR_TOOLS
    else:
        from app.agents.tools import PARAMEDIC_TOOLS
        tools = PARAMEDIC_TOOLS
    return [{"type": "function", **t["function"]} for t in tools]


async def _authenticate_ws(websocket: WebSocket) -> dict | None:
    """Authenticate and build user context."""
    token = websocket.query_params.get("token")
    if not token:
        return None

    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None

    db = get_supabase()
    user_result = db.table("users").select("*").eq("user_id", user_id).single().execute()
    if not user_result.data:
        return None

    user = user_result.data
    persona_result = db.table("user_personas").select("*").eq("user_id", user_id).execute()
    persona = persona_result.data[0] if persona_result.data else {}

    context = {
        "user_id": user["user_id"],
        "email": user["email"],
        "role_type": user["role_type"],
        "preferred_name": persona.get("preferred_name"),
        "speaking_style": persona.get("speaking_style", "Friendly"),
        "voice_preference": persona.get("voice_preference", "Female"),
        "guidance_level_override": persona.get("guidance_level_override"),
    }

    if user["role_type"] == "Supervisor":
        sup_result = db.table("supervisors").select("*").eq("user_id", user_id).execute()
        supervisor = sup_result.data[0] if sup_result.data else {}
        context.update({
            "first_name": supervisor.get("first_name", ""),
            "last_name": supervisor.get("last_name", ""),
            "title": supervisor.get("title", "Supervisor"),
            "supervisor_id": supervisor.get("supervisor_id"),
        })
    else:
        from app.agents.shift_agent import get_shift_info
        para_result = db.table("paramedics").select("*").eq("user_id", user_id).execute()
        paramedic = para_result.data[0] if para_result.data else {}
        shift_info = await get_shift_info(paramedic.get("paramedic_id", ""))
        shift = shift_info if shift_info.get("shift_id") else {}
        context.update({
            "first_name": paramedic.get("first_name", ""),
            "last_name": paramedic.get("last_name", ""),
            "badge_number": paramedic.get("badge_number", ""),
            "paramedic_id": paramedic.get("paramedic_id"),
            "shift_id": shift.get("shift_id"),
            "station": shift.get("station", ""),
            "vehicle_number": shift.get("vehicle_number", ""),
            "vehicle_description": shift.get("vehicle_description", ""),
            "service": shift.get("service", ""),
            "partner_paramedic_id": None,
        })

    return context


@router.websocket("/realtime/chat")
async def realtime_chat(websocket: WebSocket):
    """WebSocket proxy: Client <-> Backend <-> OpenAI Realtime API."""
    await websocket.accept()

    # Authenticate
    user_context = await _authenticate_ws(websocket)
    if not user_context:
        await websocket.send_json({"type": "error", "content": "Authentication failed"})
        await websocket.close(code=4001)
        return

    settings = get_settings()
    voice = REALTIME_VOICE_MAP.get(user_context.get("voice_preference", "Female"), "shimmer")

    # Mutable state for form tracking across tool calls
    form_session_data: dict | None = None
    last_submitted_id: str | None = None
    last_submitted_type: str | None = None

    # Connect to OpenAI Realtime API
    try:
        realtime_key = settings.openai_api_key
        openai_ws = await websockets.connect(
            OPENAI_REALTIME_URL,
            additional_headers={
                "Authorization": f"Bearer {realtime_key}",
                "OpenAI-Beta": "realtime=v1",
            },
            ping_interval=30,
            ping_timeout=60,
        )
    except Exception as e:
        logger.error(f"Failed to connect to OpenAI Realtime: {e}")
        await websocket.send_json({"type": "error", "content": f"Failed to connect to voice service: {e}"})
        await websocket.close()
        return

    print(f"[REALTIME] Connected to OpenAI Realtime API for {user_context.get('first_name')}")

    # Configure the session — use shared prompt builder
    session_config = {
        "type": "session.update",
        "session": {
            "instructions": build_realtime_instructions(user_context),
            "tools": _build_realtime_tools(user_context.get("role_type", "Paramedic")),
            "input_audio_transcription": {"model": "whisper-1"},
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.6,
                "prefix_padding_ms": 300,
                "silence_duration_ms": 500,
            },
            "voice": voice,
            "input_audio_format": "pcm16",
            "output_audio_format": "pcm16",
        },
    }
    await openai_ws.send(json.dumps(session_config))
    print(f"[REALTIME] Session configured: voice={voice}, VAD threshold=0.6")

    # Track pending function calls
    pending_calls: dict[str, dict] = {}  # call_id -> {name, arguments_str}

    async def forward_client_to_openai():
        """Forward audio/events from client to OpenAI."""
        try:
            while True:
                raw = await websocket.receive_text()
                data = json.loads(raw)
                msg_type = data.get("type", "")

                if msg_type == "audio":
                    # Client sends base64 PCM16 audio chunks
                    await openai_ws.send(json.dumps({
                        "type": "input_audio_buffer.append",
                        "audio": data.get("audio", ""),
                    }))
                elif msg_type == "audio_commit":
                    # Client signals end of audio input
                    await openai_ws.send(json.dumps({
                        "type": "input_audio_buffer.commit",
                    }))
                elif msg_type == "text":
                    # Text input — create a conversation item
                    await openai_ws.send(json.dumps({
                        "type": "conversation.item.create",
                        "item": {
                            "type": "message",
                            "role": "user",
                            "content": [{
                                "type": "input_text",
                                "text": data.get("content", ""),
                            }],
                        },
                    }))
                    await openai_ws.send(json.dumps({"type": "response.create"}))
                else:
                    # Forward any other events directly
                    await openai_ws.send(raw)
        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"[REALTIME] Client->OpenAI error: {e}")

    async def forward_openai_to_client():
        """Forward events from OpenAI to client, intercepting function calls."""
        nonlocal form_session_data, last_submitted_id, last_submitted_type
        try:
            async for raw_msg in openai_ws:
                event = json.loads(raw_msg)
                event_type = event.get("type", "")

                # Audio delta — forward to client for playback
                if event_type == "response.audio.delta":
                    await websocket.send_json({
                        "type": "audio",
                        "audio": event.get("delta", ""),
                    })

                # Text delta — forward for display
                elif event_type == "response.text.delta":
                    await websocket.send_json({
                        "type": "text_delta",
                        "content": event.get("delta", ""),
                    })

                # Audio transcript — forward for subtitles
                elif event_type == "response.audio_transcript.delta":
                    await websocket.send_json({
                        "type": "transcript_delta",
                        "content": event.get("delta", ""),
                    })

                # Input audio transcription — show what user said
                elif event_type == "conversation.item.input_audio_transcription.completed":
                    await websocket.send_json({
                        "type": "user_transcript",
                        "content": event.get("transcript", ""),
                    })

                # Function call arguments building
                elif event_type == "response.function_call_arguments.delta":
                    call_id = event.get("call_id", "")
                    if call_id not in pending_calls:
                        pending_calls[call_id] = {"name": "", "arguments_str": ""}
                    pending_calls[call_id]["arguments_str"] += event.get("delta", "")

                # Function call complete — execute via shared dispatcher
                elif event_type == "response.function_call_arguments.done":
                    call_id = event.get("call_id", "")
                    fn_name = event.get("name", "")
                    fn_args_str = event.get("arguments", "{}")

                    print(f"[REALTIME] Function call: {fn_name}({fn_args_str[:100]})")

                    try:
                        fn_args = json.loads(fn_args_str)
                    except json.JSONDecodeError:
                        fn_args = {}

                    # Use the shared execute_tool dispatcher
                    try:
                        result = await execute_tool(
                            fn_name, fn_args, user_context,
                            form_session_data, last_submitted_id, last_submitted_type,
                        )
                    except Exception as e:
                        print(f"[REALTIME] Tool {fn_name} failed: {e}")
                        traceback.print_exc()
                        result = {"tool_result": {"error": str(e)}}

                    # Update local state from result
                    if "form_session_data" in result:
                        form_session_data = result["form_session_data"]
                    if "last_submitted_id" in result:
                        last_submitted_id = result["last_submitted_id"]
                    if "last_submitted_type" in result:
                        last_submitted_type = result["last_submitted_type"]

                    tool_result = result.get("tool_result", {})
                    result_str = json.dumps(tool_result, default=str)

                    # Send tool result back to OpenAI
                    await openai_ws.send(json.dumps({
                        "type": "conversation.item.create",
                        "item": {
                            "type": "function_call_output",
                            "call_id": call_id,
                            "output": result_str,
                        },
                    }))
                    # Trigger OpenAI to continue responding
                    await openai_ws.send(json.dumps({"type": "response.create"}))

                    # Notify client about the action
                    action = result.get("action")
                    if not action:
                        action = "form_update" if "form_type" in tool_result else fn_name
                    await websocket.send_json({
                        "type": "action",
                        "action": action,
                        "data": tool_result,
                    })

                    # Clean up
                    pending_calls.pop(call_id, None)

                # Speech started/stopped — forward for UI
                elif event_type in ("input_audio_buffer.speech_started", "input_audio_buffer.speech_stopped"):
                    await websocket.send_json({"type": event_type})

                # Response done
                elif event_type == "response.done":
                    await websocket.send_json({"type": "response_done"})

                # Errors
                elif event_type == "error":
                    print(f"[REALTIME] OpenAI error: {event}")
                    await websocket.send_json({
                        "type": "error",
                        "content": event.get("error", {}).get("message", "Unknown error"),
                    })

        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            print(f"[REALTIME] OpenAI->Client error: {e}")
            traceback.print_exc()

    # Run both directions concurrently
    try:
        await asyncio.gather(
            forward_client_to_openai(),
            forward_openai_to_client(),
        )
    except Exception as e:
        print(f"[REALTIME] Session error: {e}")
    finally:
        try:
            await openai_ws.close()
        except Exception:
            pass
        print(f"[REALTIME] Session ended for {user_context.get('first_name')}")
