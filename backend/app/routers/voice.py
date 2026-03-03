"""
Voice REST endpoints — STT and TTS.
"""
import base64
from fastapi import APIRouter, Depends, UploadFile, File, Form
from fastapi.responses import Response
from typing import Optional

from app.dependencies import get_current_user
from app.services.voice_service import speech_to_text, text_to_speech

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/stt")
async def stt(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Convert uploaded audio to text using Whisper."""
    audio_bytes = await file.read()
    transcript = await speech_to_text(audio_bytes, filename=file.filename or "audio.webm")
    return {"transcript": transcript}


@router.post("/tts")
async def tts(
    text: str = Form(...),
    voice: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    """Convert text to speech audio. Returns MP3 binary."""
    # Use user's voice preference if not explicitly provided
    voice_pref = voice or "Female"
    audio_bytes = await text_to_speech(text, voice_pref)
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=response.mp3"},
    )


@router.post("/tts/base64")
async def tts_base64(
    text: str = Form(...),
    voice: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    """Convert text to speech. Returns base64-encoded MP3."""
    voice_pref = voice or "Female"
    audio_bytes = await text_to_speech(text, voice_pref)
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    return {"audio": audio_b64, "format": "mp3"}
