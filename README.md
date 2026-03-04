# Para AI - Paramedic AI Assistant

An AI-powered assistant that automates EMS documentation through conversational AI. Paramedics interact via voice or text to fill occurrence reports, track teddy bear distributions, manage compliance checklists, and get shift briefings — all hands-free.



## Architecture

```
React Native (Expo)           FastAPI Backend              External Services
┌──────────────┐     WS      ┌─────────────────┐         ┌──────────────┐
│  Voice Input ├────────────→│ Realtime API    │────────→│ OpenAI       │
│  (Hey Para)  │             │ Proxy           │         │ Realtime API │
├──────────────┤             ├─────────────────┤         ├──────────────┤
│  Text Chat   ├────────────→│ Agent Chat WS   │────────→│ GPT-4o       │
│              │             │ (Orchestrator)  │         │ Function     │
├──────────────┤             ├─────────────────┤         │ Calling      │
│  REST Calls  ├────────────→│ REST Endpoints  │         ├──────────────┤
│              │             │                 │────────→│ Whisper STT  │
└──────────────┘             │                 │────────→│ OpenAI TTS   │
                             │                 │         ├──────────────┤
                             │                 │────────→│ Supabase     │
                             │                 │         │ (PostgreSQL) │
                             │                 │         ├──────────────┤
                             │                 │────────→│ OpenWeather  │
                             └─────────────────┘         └──────────────┘
```

## Agentic Architecture

The Master Orchestrator uses GPT-4o function calling to route user messages to specialized sub-agents:

```
User Message
    │
    ▼
Master Orchestrator (GPT-4o)
    │
    ├── Form Agent         → Occurrence Reports, Teddy Bear Tracking
    │                        (auto-fills 60% from DB, asks user for 40%)
    ├── Checklist Agent    → Form 4 compliance status + guidance
    ├── Shift Agent        → Shift info, partner details, outstanding items
    ├── Supervisor Agent   → Team oversight, report review, compliance
    └── Weather Service    → Road conditions, safety warnings
```

All agent actions are logged to `audit_log` for compliance tracking.

## Features

- **Voice-First**: OpenAI Realtime API for ~500ms speech-to-speech latency
- **Wake Word**: "Hey Para" via Porcupine (on-device, OS-level foreground service)
- **Smart Form Filling**: AI extracts fields from natural conversation, auto-fills from DB
- **Draft Auto-Save**: Forms persist to DB immediately — never lose progress if interrupted
- **Compliance Checklist**: Form 4 status tracking with guidance for BAD items
- **Pre-Shift Briefing**: Shift info + checklist + weather + outstanding items in one call
- **Email Reports**: Send completed forms to supervisor as HTML + PDF + XML
- **Dual Role Support**: Paramedics and Supervisors have different tool sets
- **Full Audit Trail**: Every AI decision, tool call, and reasoning logged for compliance

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python, FastAPI |
| Database | Supabase (PostgreSQL) |
| LLM | OpenAI GPT-4o (function calling) |
| Voice (Primary) | OpenAI Realtime API |
| Voice (Fallback) | Whisper STT + OpenAI TTS |
| Wake Word | Picovoice Porcupine |
| Weather | OpenWeatherMap API |
| Email | SMTP (Gmail) |
| Frontend | React Native, Expo |
| PDF Generation | fpdf2 |

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Badge number or email login |
| POST | `/auth/logout` | End session |
| GET | `/auth/me` | Current user profile |

### Real-Time
| Method | Path | Description |
|--------|------|-------------|
| WS | `/agent/chat` | Text chat + fallback voice (STT/TTS) |
| WS | `/realtime/chat` | Primary voice via OpenAI Realtime API |

### Voice
| Method | Path | Description |
|--------|------|-------------|
| POST | `/voice/stt` | Audio file to text (Whisper) |
| POST | `/voice/tts` | Text to MP3 audio |
| POST | `/voice/tts/base64` | Text to base64 audio |

### Forms
| Method | Path | Description |
|--------|------|-------------|
| GET | `/forms/drafts` | List draft forms |
| GET | `/forms/{type}/{id}/preview` | Preview form before submit |
| POST | `/forms/{type}/{id}/submit` | Submit form |
| POST | `/forms/{type}/{id}/email` | Email form to supervisor (PDF + XML) |
| PATCH | `/forms/{type}/{id}` | Edit draft fields |

### Status & Shifts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/status/check` | Form 4 compliance items |
| POST | `/status/acknowledge/{id}` | Mark item as seen |
| GET | `/shifts/current` | Current shift + partner |
| GET | `/shifts/outstanding` | Pending items |
| GET | `/shifts/pre-brief` | Full pre-shift briefing |
| GET | `/shifts/{id}/summary` | End-of-shift summary |

### Weather
| Method | Path | Description |
|--------|------|-------------|
| GET | `/weather/current` | Weather + road warnings |

## Backend Setup

### Prerequisites
- Python 3.11+
- Supabase project
- OpenAI API key
- OpenWeatherMap API key (free tier)

### Installation

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key
- `OPENWEATHER_API_KEY` - OpenWeatherMap key
- `JWT_SECRET` - Secret for JWT signing
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` - Email config

### Database Setup

Run the SQL migrations in your Supabase SQL Editor (in order):

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_add_form_fields.sql`
3. `supabase/migrations/003_expand_audit_log.sql`

### Seed Demo Data

```bash
python seed_data.py
```

Creates demo users:
- **Jordan Riley** (Paramedic, badge: B-3047, password: medic123)
- **Alex Chen** (Paramedic, badge: B-2198, password: medic123)
- **Sam Torres** (Supervisor, email: chief@EffectiveAl.net, password: super123)

Schedule data sourced from: https://www.effectiveai.net/calendars/march-2026.html

### Run

```bash
python run.py
```

Server starts at `http://127.0.0.1:8000`. API docs at `http://127.0.0.1:8000/docs`.

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, CORS, routers
│   ├── config.py               # Pydantic Settings (.env)
│   ├── database.py             # Supabase client
│   ├── dependencies.py         # JWT auth dependency
│   ├── routers/
│   │   ├── auth.py             # Login, logout, profile
│   │   ├── agent.py            # WebSocket /agent/chat
│   │   ├── realtime.py         # WebSocket /realtime/chat (OpenAI proxy)
│   │   ├── voice.py            # STT/TTS REST endpoints
│   │   ├── forms.py            # Form CRUD, submit, email
│   │   ├── status.py           # Form 4 compliance
│   │   ├── shifts.py           # Shift info, briefings, summaries
│   │   └── weather.py          # Weather endpoint
│   ├── agents/
│   │   ├── orchestrator.py     # Master Agent (GPT-4o routing)
│   │   ├── form_agent.py       # Form filling + draft persistence
│   │   ├── checklist_agent.py  # Form 4 status + guidance
│   │   ├── shift_agent.py      # Shift info + outstanding items
│   │   ├── supervisor_agent.py # Team management tools
│   │   └── tools.py            # OpenAI function definitions
│   ├── services/
│   │   ├── voice_service.py    # Whisper STT + OpenAI TTS
│   │   ├── weather_service.py  # OpenWeatherMap API
│   │   ├── email_service.py    # SMTP + PDF + XML generation
│   │   └── audit_service.py    # Compliance audit logging
│   └── schemas/
│       ├── auth.py             # Auth request/response models
│       ├── agent.py            # WebSocket message models
│       └── common.py           # Shared models
├── supabase/
│   └── migrations/             # SQL schema files
├── requirements.txt
├── .env.example
├── seed_data.py                # Demo data seeder
└── run.py                      # Uvicorn launcher
```

## Schedule Integration

Shift schedules are sourced from the EAI Ambulance Service website. The scraping tool populates the `shifts` table with team assignments, stations, vehicles, and times for the full month.

Source: [EAI March 2026 Schedule](https://www.effectiveai.net/calendars/march-2026.html)

## Compliance & Audit

Every AI action is logged to the `audit_log` table:

| Field | Purpose |
|-------|---------|
| `session_id` | Groups actions within a conversation |
| `agent_name` | Which agent acted (orchestrator, form_agent, etc.) |
| `tool_name` | Function called (start_occurrence_report, submit_form, etc.) |
| `tool_args` | Arguments passed to the function |
| `tool_result` | What the function returned |
| `ai_reasoning` | The AI's reasoning before taking action |
| `user_message` | What the user said to trigger the action |
| `form_id` | Links to the specific form being modified |
| `duration_ms` | How long the tool execution took |

## Team

Built by the EAI Ambulance Service hackathon team.
