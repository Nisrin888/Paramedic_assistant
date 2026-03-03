from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class LoginRequest(BaseModel):
    badge_number: Optional[str] = None
    email: Optional[str] = None
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserProfile"


class UserProfile(BaseModel):
    user_id: UUID
    email: str
    role_type: str
    is_first_login: bool
    first_name: str
    last_name: str
    badge_number: Optional[str] = None
    persona: Optional["PersonaSummary"] = None


class PersonaSummary(BaseModel):
    speaking_style: str = "Friendly"
    voice_preference: str = "Female"
    preferred_name: Optional[str] = None
    guidance_level_override: Optional[str] = None


# Rebuild models to resolve forward references
LoginResponse.model_rebuild()
UserProfile.model_rebuild()
