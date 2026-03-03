"""
Voice Service — OpenAI Whisper (STT) + OpenAI TTS
"""
import base64
import io
from openai import AsyncOpenAI
from app.config import get_settings

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=get_settings().openai_api_key)
    return _client


# Voice mapping based on user persona preference
VOICE_MAP = {
    "Female": "nova",
    "Male": "onyx",
}


async def speech_to_text(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Convert audio bytes to text using OpenAI Whisper."""
    client = _get_client()

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    transcript = await client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="text",
    )
    return transcript.strip()


async def speech_to_text_base64(audio_b64: str, filename: str = "audio.webm") -> str:
    """Convert base64-encoded audio to text."""
    audio_bytes = base64.b64decode(audio_b64)
    return await speech_to_text(audio_bytes, filename)


async def text_to_speech(text: str, voice_preference: str = "Female") -> bytes:
    """Convert text to audio using OpenAI TTS. Returns MP3 bytes."""
    client = _get_client()
    voice = VOICE_MAP.get(voice_preference, "nova")

    response = await client.audio.speech.create(
        model="tts-1",
        voice=voice,
        input=text,
        response_format="mp3",
    )
    return response.content


async def text_to_speech_base64(text: str, voice_preference: str = "Female") -> str:
    """Convert text to base64-encoded audio."""
    audio_bytes = await text_to_speech(text, voice_preference)
    return base64.b64encode(audio_bytes).decode("utf-8")
