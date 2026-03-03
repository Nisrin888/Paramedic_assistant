from pydantic import BaseModel
from typing import Optional


class WSMessage(BaseModel):
    """Incoming WebSocket message from client."""
    type: str = "text"  # "text" or "audio"
    content: str  # text string or base64 audio
    session_id: Optional[str] = None


class WSResponse(BaseModel):
    """Outgoing WebSocket message to client."""
    type: str = "text"  # "text" or "audio"
    content: str
    action: Optional[str] = None  # "form_update", "form_submitted", etc.
    data: Optional[dict] = None  # payload for frontend (form fields, status, etc.)
