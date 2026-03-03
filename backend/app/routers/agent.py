"""
WebSocket endpoint for real-time AI conversation.
"""
import json
import logging
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError

from app.config import get_settings
from app.database import get_supabase
from app.agents.orchestrator import OrchestratorSession
from app.services.voice_service import speech_to_text_base64, text_to_speech_base64

logger = logging.getLogger(__name__)

router = APIRouter(tags=["agent"])


async def _authenticate_ws(websocket: WebSocket) -> dict | None:
    """Authenticate WebSocket via token query param or first message."""
    token = websocket.query_params.get("token")
    if not token:
        try:
            first_msg = await websocket.receive_text()
            data = json.loads(first_msg)
            token = data.get("token")
        except Exception:
            return None

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
        para_result = db.table("paramedics").select("*").eq("user_id", user_id).execute()
        paramedic = para_result.data[0] if para_result.data else {}

        from app.agents.shift_agent import get_shift_info
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


@router.websocket("/agent/chat")
async def agent_chat(websocket: WebSocket):
    await websocket.accept()

    # Authenticate
    user_context = await _authenticate_ws(websocket)
    if not user_context:
        await websocket.send_json({"type": "error", "content": "Authentication failed"})
        await websocket.close(code=4001)
        return

    session = OrchestratorSession(user_context)

    # Send welcome
    name = user_context.get("preferred_name") or user_context.get("first_name", "there")
    role = user_context.get("role_type", "Paramedic")
    if role == "Supervisor":
        welcome = f"Hello {name}! I'm your Paramedic AI Assistant — Supervisor Dashboard. You can ask me about your team's reports, compliance status, shift summaries, or insights. How can I help?"
    else:
        welcome = f"Hey {name}! I'm your Paramedic AI Assistant. How can I help you today?"
    await websocket.send_json({
        "type": "text",
        "content": welcome,
        "action": None,
        "data": None,
    })

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            msg_type = data.get("type", "text")
            content = data.get("content", "")

            # Handle audio input — STT first
            if msg_type == "audio":
                try:
                    content = await speech_to_text_base64(content)
                    print(f"[WS] STT transcript: {content[:100]}")
                except Exception as e:
                    print(f"[WS] STT failed: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "content": f"Could not transcribe audio: {e}",
                    })
                    continue

            if not content.strip():
                continue

            # Determine if client wants audio response
            want_audio = data.get("respond_audio", msg_type == "audio")
            voice_pref = user_context.get("voice_preference", "Female")

            # Process through orchestrator
            try:
                result = await session.handle_message(content)
                response = {
                    "type": "text",
                    "content": result["text"],
                    "action": result.get("action"),
                    "data": result.get("data"),
                }

                # Generate TTS if client wants audio back
                if want_audio and result["text"]:
                    try:
                        audio_b64 = await text_to_speech_base64(result["text"], voice_pref)
                        response["audio"] = audio_b64
                        response["audio_format"] = "mp3"
                    except Exception as e:
                        print(f"[WS] TTS failed: {e}")

            except Exception as e:
                logger.error(f"Orchestrator error: {traceback.format_exc()}")
                response = {
                    "type": "error",
                    "content": f"Sorry, something went wrong: {e}",
                    "action": None,
                    "data": None,
                }

            await websocket.send_json(response)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {traceback.format_exc()}")
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass
