"""
Voice Service — Deepgram Nova-2 (STT) + ElevenLabs (TTS)
"""
import base64
import io
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# Voice mapping based on user persona preference
VOICE_MAP: dict[str, str] = {}


def _voice_map() -> dict[str, str]:
    """Lazy-init voice map from settings."""
    if not VOICE_MAP:
        s = get_settings()
        VOICE_MAP["Female"] = s.voice_id_female or s.elevenlabs_voice_id
        VOICE_MAP["Male"] = s.voice_id_male or s.elevenlabs_voice_id
    return VOICE_MAP


async def speech_to_text(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio via Deepgram Nova-2 REST API."""
    settings = get_settings()
    if not settings.deepgram_api_key:
        raise ValueError("DEEPGRAM_API_KEY not set")

    # Infer content type from filename extension
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webm"
    content_type_map = {
        "webm": "audio/webm",
        "m4a": "audio/mp4",
        "mp4": "audio/mp4",
        "wav": "audio/wav",
        "mp3": "audio/mpeg",
        "ogg": "audio/ogg",
    }
    content_type = content_type_map.get(ext, "audio/webm")

    url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true"
    headers = {
        "Authorization": f"Token {settings.deepgram_api_key}",
        "Content-Type": content_type,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, content=audio_bytes, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    channels = (data.get("results") or {}).get("channels") or [{}]
    alternatives = (channels[0] if channels else {}).get("alternatives") or [{}]
    transcript = (alternatives[0] if alternatives else {}).get("transcript", "")
    return (transcript or "").strip()


async def speech_to_text_base64(audio_b64: str, filename: str = "audio.webm") -> str:
    """Transcribe base64-encoded audio via Deepgram."""
    audio_bytes = base64.b64decode(audio_b64)
    return await speech_to_text(audio_bytes, filename)


async def text_to_speech(text: str, voice_preference: str = "Female") -> bytes:
    """Convert text to audio via ElevenLabs. Returns MP3 bytes."""
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        raise ValueError("ELEVENLABS_API_KEY not set")

    voice_id = _voice_map().get(voice_preference, settings.elevenlabs_voice_id)

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.content


async def text_to_speech_base64(text: str, voice_preference: str = "Female") -> str:
    """Convert text to base64-encoded MP3 audio via ElevenLabs."""
    audio_bytes = await text_to_speech(text, voice_preference)
    return base64.b64encode(audio_bytes).decode("utf-8")
