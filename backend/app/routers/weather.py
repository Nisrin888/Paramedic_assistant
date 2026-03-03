"""
Weather REST endpoint.
"""
from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.services.weather_service import get_current_weather

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/current")
async def weather_current(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    user: dict = Depends(get_current_user),
):
    """Get current weather and road condition warnings for a location."""
    try:
        result = await get_current_weather(lat, lon)
        return result
    except Exception as e:
        return {"error": str(e)}
