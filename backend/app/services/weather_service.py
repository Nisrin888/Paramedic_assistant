"""
Weather Service — OpenWeatherMap API integration.
"""
import httpx
from app.config import get_settings

OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5"


async def get_current_weather(lat: float, lon: float) -> dict:
    """Get current weather + alerts for a location."""
    settings = get_settings()
    api_key = settings.openweather_api_key

    if not api_key:
        return {"error": "Weather API key not configured"}

    async with httpx.AsyncClient(timeout=10) as client:
        # Current weather
        resp = await client.get(
            f"{OPENWEATHER_BASE}/weather",
            params={
                "lat": lat,
                "lon": lon,
                "appid": api_key,
                "units": "metric",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    temp_c = data["main"]["temp"]
    feels_like_c = data["main"]["feels_like"]
    temp_f = round(temp_c * 9 / 5 + 32, 1)
    feels_like_f = round(feels_like_c * 9 / 5 + 32, 1)

    weather = {
        "location": data.get("name", "Unknown"),
        "temperature_c": round(temp_c, 1),
        "temperature_f": temp_f,
        "feels_like_c": round(feels_like_c, 1),
        "feels_like_f": feels_like_f,
        "humidity": data["main"]["humidity"],
        "wind_speed_kmh": round(data["wind"]["speed"] * 3.6, 1),
        "wind_direction": _deg_to_compass(data["wind"].get("deg", 0)),
        "description": data["weather"][0]["description"].title() if data.get("weather") else "N/A",
        "visibility_km": round(data.get("visibility", 10000) / 1000, 1),
        "conditions": data["weather"][0]["main"] if data.get("weather") else "Unknown",
    }

    # Road condition warnings based on weather
    warnings = []
    if temp_c <= 0:
        warnings.append("Below freezing — watch for ice on roads")
    if weather["visibility_km"] < 1:
        warnings.append("Very low visibility — use caution")
    elif weather["visibility_km"] < 5:
        warnings.append("Reduced visibility")
    if weather["wind_speed_kmh"] > 60:
        warnings.append("High winds — secure equipment")
    conditions = weather["conditions"].lower()
    if "rain" in conditions:
        warnings.append("Wet roads — reduce speed")
    if "snow" in conditions:
        warnings.append("Snow — slippery conditions")
    if "thunder" in conditions:
        warnings.append("Thunderstorm — seek shelter if possible")

    weather["warnings"] = warnings
    weather["briefing"] = _build_briefing(weather)

    return weather


def _deg_to_compass(deg: float) -> str:
    """Convert wind degrees to compass direction."""
    directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = round(deg / 45) % 8
    return directions[idx]


def _build_briefing(weather: dict) -> str:
    """Build a human-readable weather briefing for pre-shift."""
    parts = [
        f"Current conditions: {weather['description']}, {weather['temperature_c']}\u00b0C ({weather['temperature_f']}\u00b0F)",
        f"Feels like {weather['feels_like_c']}\u00b0C. Humidity {weather['humidity']}%.",
        f"Wind {weather['wind_speed_kmh']} km/h from {weather['wind_direction']}.",
        f"Visibility {weather['visibility_km']} km.",
    ]
    if weather["warnings"]:
        parts.append("Warnings: " + "; ".join(weather["warnings"]))
    return " ".join(parts)
