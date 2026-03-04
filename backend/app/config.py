from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_service_key: str

    # OpenRouter — LLM chat completions
    openrouter_api_key: str
    openrouter_api_base: str = "https://openrouter.ai/api/v1"
    llm_model: str = "openai/gpt-4o"

    # OpenAI direct — for Whisper STT, TTS, and Realtime API
    openai_api_key: str = ""

    # Deepgram — STT (Nova-2)
    deepgram_api_key: str = ""

    # ElevenLabs — TTS
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "cgSgspJ2msm6clMCkdW9"
    voice_id_female: str = "cgSgspJ2msm6clMCkdW9"
    voice_id_male: str = "ZoiZ8fuDWInAcwPXaVeq"

    # Weather
    openweather_api_key: str = ""

    # Email / SMTP
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = ""

    # LangGraph checkpointer — direct PostgreSQL connection string
    supabase_db_url: str = ""

    # Auth
    jwt_secret: str = "dev-secret-change-me"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
