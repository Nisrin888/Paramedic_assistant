from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
import hashlib

from app.config import get_settings
from app.database import get_supabase
from app.dependencies import get_current_user
from app.schemas.auth import LoginRequest, LoginResponse, UserProfile, PersonaSummary

router = APIRouter(prefix="/auth", tags=["auth"])

TOKEN_EXPIRY_HOURS = 24


def _hash_password(password: str) -> str:
    """Simple SHA-256 hash for hackathon. Use bcrypt in production."""
    return hashlib.sha256(password.encode()).hexdigest()


def _create_token(user_id: str) -> str:
    settings = get_settings()
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _build_profile(user: dict, paramedic: dict | None, persona: dict | None) -> UserProfile:
    return UserProfile(
        user_id=user["user_id"],
        email=user["email"],
        role_type=user["role_type"],
        is_first_login=user.get("is_first_login", True),
        first_name=paramedic["first_name"] if paramedic else user.get("email", "").split("@")[0],
        last_name=paramedic["last_name"] if paramedic else "",
        badge_number=paramedic["badge_number"] if paramedic else None,
        persona=PersonaSummary(
            speaking_style=persona.get("speaking_style", "Friendly"),
            voice_preference=persona.get("voice_preference", "Female"),
            preferred_name=persona.get("preferred_name"),
            guidance_level_override=persona.get("guidance_level_override"),
        ) if persona else None,
    )


def _build_supervisor_profile(user: dict, supervisor: dict | None, persona: dict | None) -> UserProfile:
    return UserProfile(
        user_id=user["user_id"],
        email=user["email"],
        role_type=user["role_type"],
        is_first_login=user.get("is_first_login", True),
        first_name=supervisor["first_name"] if supervisor else user.get("email", "").split("@")[0],
        last_name=supervisor["last_name"] if supervisor else "",
        badge_number=None,
        persona=PersonaSummary(
            speaking_style=persona.get("speaking_style", "Professional"),
            voice_preference=persona.get("voice_preference", "Female"),
            preferred_name=persona.get("preferred_name"),
            guidance_level_override=persona.get("guidance_level_override"),
        ) if persona else None,
    )


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    db = get_supabase()

    if not body.badge_number and not body.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either badge_number or email",
        )

    user = None
    paramedic = None
    supervisor = None

    if body.badge_number:
        # Paramedic login by badge
        para_result = (
            db.table("paramedics")
            .select("*, users(*)")
            .eq("badge_number", body.badge_number)
            .execute()
        )
        if not para_result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        paramedic = para_result.data[0]
        user = paramedic["users"]

    else:
        # Supervisor/Admin login by email
        user_result = (
            db.table("users")
            .select("*")
            .eq("email", body.email)
            .execute()
        )
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        user = user_result.data[0]

        # Get supervisor profile if applicable
        sup_result = (
            db.table("supervisors")
            .select("*")
            .eq("user_id", user["user_id"])
            .execute()
        )
        supervisor = sup_result.data[0] if sup_result.data else None

    # Verify password
    if user["password_hash"] != _hash_password(body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Fetch persona
    persona_result = (
        db.table("user_personas")
        .select("*")
        .eq("user_id", user["user_id"])
        .execute()
    )
    persona = persona_result.data[0] if persona_result.data else None

    # Generate token
    token = _create_token(user["user_id"])

    # Mark first login as done
    if user.get("is_first_login", True):
        db.table("users").update({"is_first_login": False}).eq("user_id", user["user_id"]).execute()

    # Build profile based on role
    if paramedic:
        profile = _build_profile(user, paramedic, persona)
    else:
        profile = _build_supervisor_profile(user, supervisor, persona)

    return LoginResponse(
        access_token=token,
        user=profile,
    )


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    # Stateless JWT — client discards the token.
    # Log the logout event for auditing.
    db = get_supabase()
    db.table("audit_log").insert({
        "user_id": user["user_id"],
        "action": "logout",
    }).execute()
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserProfile)
async def me(user: dict = Depends(get_current_user)):
    db = get_supabase()

    # Get persona
    persona_result = (
        db.table("user_personas")
        .select("*")
        .eq("user_id", user["user_id"])
        .execute()
    )
    persona = persona_result.data[0] if persona_result.data else None

    if user["role_type"] == "Paramedic":
        para_result = (
            db.table("paramedics")
            .select("*")
            .eq("user_id", user["user_id"])
            .execute()
        )
        paramedic = para_result.data[0] if para_result.data else None
        return _build_profile(user, paramedic, persona)
    else:
        sup_result = (
            db.table("supervisors")
            .select("*")
            .eq("user_id", user["user_id"])
            .execute()
        )
        supervisor = sup_result.data[0] if sup_result.data else None
        return _build_supervisor_profile(user, supervisor, persona)
