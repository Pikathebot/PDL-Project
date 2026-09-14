# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Sentinel: a citizen incident-reporting PWA (React) + FastAPI backend + Celery AI pipeline + dispatcher dashboard. Three top-level Python/JS packages: `backend/` (FastAPI, SQLAlchemy async, Celery), `ai_pipeline/` (YOLOv8, LLM provider bridge, embeddings, Whisper, EXIF), `frontend/` (Vite + React 18 + Tailwind v4 + Leaflet).

Note: README references `docs/` and `docs/setup-guide.md`; that directory does not exist. `backend/alembic/versions/` also does not exist — the schema is created with `Base.metadata.create_all` (see `backend/app/db/seed.py`), not migrations.

## Commands

All Python commands run from the **repo root** with `PYTHONPATH=.` — every import is `backend.app...` / `ai_pipeline...`.

```powershell
# Backend tests (Windows PowerShell — required form per .agents/rules/testing-guidelines.md)
$env:PYTHONPATH="."; .\.venv\Scripts\python.exe -m pytest backend/tests
$env:PYTHONPATH="."; .\.venv\Scripts\python.exe -m pytest backend/tests/test_incidents.py::test_name   # single test
$env:PYTHONPATH="."; .\.venv\Scripts\python.exe -m pytest ai_pipeline/tests

# Backend dev server / Celery worker / seed data
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --port 8000
.\.venv\Scripts\python.exe -m celery -A backend.app.tasks.celery_app.celery_app worker --loglevel=info --pool=solo   # --pool=solo required on Windows
$env:PYTHONPATH="."; .\.venv\Scripts\python.exe -m backend.app.db.seed          # users + responders only, idempotent
$env:PYTHONPATH="."; .\.venv\Scripts\python.exe -m backend.app.db.seed_demo     # 18 Mumbai incidents through the real pipeline; --reset to wipe & redo, --no-process to skip AI

# Frontend (cd frontend)
npm run dev          # Vite on :5173, proxies /api, /ws, /media_uploads -> :8000
npm run test:unit    # vitest, only src/tests/**
npx vitest run src/tests/api.test.js   # single file
npm run test:e2e     # playwright, tests/e2e/ (starts vite itself)
npm run lint         # eslint --max-warnings 0
npm run build

# Infra (Postgres+PostGIS, Redis) only. This machine has a native PostgreSQL 18
# service on 5432 that silently wins connections, so .env sets POSTGRES_PORT=5433
# and the dev compose maps the container to that host port.
docker compose -f docker-compose.dev.yml up -d
# Everything containerised (backend, celery, nginx frontend)
docker compose up --build
```

`run.bat` does all of the above for local dev on Windows: with Docker it runs Postgres/Redis + a Celery worker; without Docker it switches to **standalone mode** (`DATABASE_URL=sqlite+aiosqlite:///./sentinel_dev.db`, `AI_PROCESSING_MODE=inline` — the pipeline runs as a FastAPI `BackgroundTask` in the API process, no Redis needed). It also starts llama-server from `LLAMA_SERVER_EXE`/`LLAMA_MODEL_GGUF` (defaults at the top of the file) and seeds users + demo incidents. `SKIP_DEMO_SEED=1` skips the incident seed. `Makefile` targets (`make test`, `make lint`) assume a POSIX shell. Python lint is `ruff check backend ai_pipeline` (`ruff.toml`: pyflakes `F` + syntax `E9` only — style codes are deliberately off). ORM forward refs like `Mapped["Responder"]` need a `TYPE_CHECKING` import or ruff reports F821.

Backend tests need no services: `backend/tests/conftest.py` swaps in an in-memory aiosqlite engine and monkeypatches `process_incident_ai.delay` to a no-op. `pytest.ini` sets `asyncio_mode = auto`, so async tests need no marker.

Vitest and Playwright coexist in `frontend/`; `vite.config.js` `test.include` must keep Vitest out of `tests/e2e/`.

## Architecture

### Request → AI pipeline flow

1. `POST /api/v1/incidents/` (`backend/app/api/v1/endpoints/incidents.py`) saves uploads via `services/storage.py` (local `media_uploads/`, served statically by FastAPI; `file_path` on `MediaAttachment` is a **URL** `/media_uploads/<uuid>.ext`, use `storage_service.resolve_path()` for filesystem access), creates the `Incident` in status `REPORTED`, broadcasts over WebSocket, then fires `process_incident_ai.delay()` (failure is swallowed so reports succeed without Redis).
2. `backend/app/tasks/ai_tasks.py::_process_incident` is the whole async pipeline (reached via Celery `process_incident_ai` or, in inline mode, directly as a background task): per-attachment routing by `media_type` (image → EXIF + YOLO; video → `ai_pipeline/vision/keyframes.py` samples 3 frames through YOLO and writes the best one beside the video as `keyframe_url`; only the first visual attachment sets classification/severity; audio → Whisper transcript appended to description), LLM extraction → `structured_details`, embedding → `embedding_json`, Union-Find dedup → `IncidentCluster`, priority score, then status `VERIFIED` and a `incident_ai_processed` WS broadcast (only reaches clients in inline mode — a Celery worker has its own empty `ws_manager`, so the dashboard also polls every 15 s). `VERIFIED` means "AI triage done" and is the filter for dedup candidates, so it is set even when every model is mocked.
3. Every AI component degrades gracefully to a mock/fallback and reports it: `model_available` (YOLO, Whisper), `EmbeddingResult.is_semantic` (hash fallback when sentence-transformers is missing — dedup refuses to cluster on non-semantic vectors), and `structured_details.ai_provenance` records what actually ran. Preserve this honesty when touching the pipeline; don't invent severities/confidences from mocks.

### AI provider bridge

`ai_pipeline/providers/factory.py::get_ai_provider(name, overrides)` reads `ai_pipeline/config.yaml` and layers `overrides` on top; `LLMExtractor` builds those overrides from `Settings` (`AI_PROVIDER`, `LLAMASERVER_API_URL`, …), so the backend `.env` wins over `config.yaml`. Providers: `llamaserver` (default — llama.cpp `llama-server.exe`, port 8080), `lmstudio`, `openai` (all thin subclasses of `providers/openai_compat.py::OpenAICompatibleProvider`), and `llamacpp` (in-process, needs `llama_cpp` + a GGUF).

Extraction contract lives in `providers/base.py`: `EXTRACTION_SCHEMA` is sent as `response_format: json_schema` (llama-server enforces it by grammar; a 400 triggers one retry without it), `parse_structured_output` tolerates fences/chatter, and `extract_structured_data` always returns `model_available` + `parsed`. `generate()` raises `ProviderUnavailableError` rather than returning placeholder text. Thinking models (Qwen3 family) need `extra_body.chat_template_kwargs.enable_thinking: false` (set in config.yaml) or `content` comes back empty.

Local dev: use the CUDA build at `%LOCALAPPDATA%\llama.cpp\cuda-b10809\llama-server.exe -m <model>.gguf --port 8080 -c 4096 -ngl 99` (~33 tok/s on the RTX 4060; the winget/Vulkan build on PATH is ~5 tok/s). GGUFs on this machine live in `D:\JARVIS\models`. YOLO weights (`yolov8n.pt`) auto-download to the repo root on first detect and are gitignored.

### Algorithms (`backend/app/algorithms/`)

- `union_find.py`: duplicate = ≤200 m, ≤2 h, cosine ≥ 0.55 on semantic embeddings.
- `priority_queue.py::calculate_priority_score`: severity + corroboration + queue age + category; new incidents start at placeholder 50.0 until the pipeline runs.
- `kd_tree.py`: nearest-responder lookup for `GET /{id}/nearest-responders` and `/dispatch`.

### Auth

`core/auth.py`: bcrypt + HS256 JWT (`SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`). `POST /api/v1/auth/login` → token; `require_dispatcher` (dispatcher or admin role) guards every incident endpoint except the citizen pair `POST /incidents/` and `GET /incidents/track/{id}`. Seed accounts all use password `admin123`. Tests: the `client` fixture carries a real dispatcher JWT; use `anon_client` for citizen endpoints or to prove a guard. Frontend: `services/auth.js` owns the session in `localStorage['sentinel.auth']`; `api.js::dispatcherFetch` attaches the bearer and clears the session on 401; `RequireAuth` in `App.jsx` gates `/dashboard` and `/analytics`.

### Realtime

`core/websocket_manager.py` — `/ws/incidents?token=` accepts a dispatcher/admin JWT (what the logged-in dashboard sends) or the static `WS_ACCESS_TOKEN` (↔ frontend `VITE_WS_TOKEN`, kept for scripted clients); bad token closes with 4001, capacity with 4002. Messages are `{"event": ..., "data": ...}`. `frontend/src/services/websocket.js` handles reconnect/backoff and treats those codes as non-retryable.

### Frontend

PWA assets live in `frontend/public/` (icons generated once; `sentinel.svg` is the vector source). The service worker only registers in dev when `VITE_PWA_DEV=true` (`run.bat` sets it). Single `App.jsx` holds the three routes: `/` citizen report form, `/dashboard` dispatcher (Leaflet map + queue + detail panel), `/analytics`. `services/api.js` is the only HTTP layer. Tests live in `src/tests/` with `setup.js` (jsdom + jest-dom).

### Config

`backend/app/core/config.py::Settings` (pydantic-settings, reads root `.env`; see `.env.example` for every key). Schema changes: there are no Alembic migrations — tables come from `create_all` in `seed.py`, so after adding a column (e.g. `dispatched_at`) an existing database needs `docker compose down -v` / deleting `sentinel_dev.db`. `TURNSTILE_SECRET_KEY` must stay blank until a Turnstile widget exists in the frontend — setting it 403s every report. `SQL_ECHO` stays off because logs would include reporter PII.
