import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.routers import auth, agent, voice, realtime, status, shifts, weather, forms


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify DB connection
    from app.database import get_supabase
    get_supabase()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="Paramedic AI Assistant",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow Expo dev + common origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:3000",
        "exp://localhost:8081",
        "*",  # hackathon convenience — tighten for production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(agent.router)
app.include_router(voice.router)
app.include_router(realtime.router)
app.include_router(status.router)
app.include_router(shifts.router)
app.include_router(weather.router)
app.include_router(forms.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
