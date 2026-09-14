# Sentinel: AI-Powered Public Safety & Incident Response Platform

Sentinel is a citizen-facing incident reporting PWA paired with an AI triage pipeline and a dispatcher dashboard. A citizen submits a photo / voice note / video with a GPS fix and a description; the pipeline classifies the hazard (YOLOv8), extracts a structured record with a local LLM, transcribes audio (Whisper), verifies photo provenance (EXIF), embeds the report for semantic deduplication, clusters duplicate reports of the same event (Union-Find), scores priority for the dispatcher queue (weighted heap), and finds the nearest available responder (k-d tree). Dispatchers see all of this live over WebSockets on a Leaflet map.

## Quick start (Windows)

```bat
run.bat
```

That is the whole setup. The launcher:

- creates `.venv` and installs `backend/requirements.txt` and `frontend/node_modules` if missing;
- **with Docker running**: starts Postgres + Redis and a Celery worker;
- **without Docker**: switches to standalone mode — SQLite database, AI pipeline runs inline in the API process;
- starts `llama-server` if `LLAMA_SERVER_EXE` / `LLAMA_MODEL_GGUF` point at real files (defaults at the top of `run.bat`);
- seeds users, responders and a demo set of 18 Mumbai incidents through the real pipeline (skipped if already present; `SKIP_DEMO_SEED=1` to skip).

Then open <http://localhost:5173> (citizen) or <http://localhost:5173/dashboard> (dispatcher). Seeded dispatcher login: `dispatcher@sentinel.gov` / `admin123` (admin: `admin@sentinel.gov` / `admin123`).

## Manual setup

```bash
# Backend (from the repo root; imports are `backend.app...` / `ai_pipeline...`)
python -m venv .venv && .venv/Scripts/pip install -r backend/requirements.txt
cp .env.example .env                      # edit as needed
PYTHONPATH=. python -m backend.app.db.seed          # users + responders
PYTHONPATH=. python -m backend.app.db.seed_demo     # demo incidents (--reset to redo)
PYTHONPATH=. python -m uvicorn backend.app.main:app --reload --port 8000
PYTHONPATH=. python -m celery -A backend.app.tasks.celery_app.celery_app worker --pool=solo   # unless AI_PROCESSING_MODE=inline

# Frontend
cd frontend && npm install && npm run dev

# Local LLM (llama.cpp, OpenAI-compatible on :8080) - any instruct GGUF works
llama-server -m path/to/model.gguf --port 8080 -c 4096 -ngl 99
```

Full containerised stack: `docker compose up --build` (nginx frontend on :80, API on :8000).

## AI components and what happens without them

Every component degrades honestly rather than faking output, and `structured_details.ai_provenance` on each incident records what actually ran.

| Component | Needs | Without it |
|---|---|---|
| Hazard detection | `ultralytics` (weights auto-download) | `ai_classification` stays null, reporter severity kept |
| LLM extraction | `llama-server` on `LLAMASERVER_API_URL` (or `lmstudio` / `openai` via `AI_PROVIDER`) | `structured_details.model_available = false` |
| Transcription | `openai-whisper` + ffmpeg | voice notes stored, not transcribed |
| Deduplication | `sentence-transformers` (in requirements) | hash embeddings flagged non-semantic; clustering refuses to run |
| EXIF check | Pillow (in requirements) | — |

## Tests and lint

```bash
PYTHONPATH=. python -m pytest backend/tests ai_pipeline/tests   # no services needed (in-memory SQLite, Celery stubbed)
ruff check backend ai_pipeline
cd frontend && npm run test:unit && npm run lint && npm run test:e2e
```

## Repository layout

- `backend/` — FastAPI app, SQLAlchemy (async) models, Celery task, algorithms (`union_find.py`, `priority_queue.py`, `kd_tree.py`), seed scripts.
- `ai_pipeline/` — provider bridge (`providers/`), vision (`detector.py`, `keyframes.py`, `exif.py`), NLP (`extractor.py`, `embeddings.py`, `transcriber.py`).
- `frontend/` — Vite + React 18 + Tailwind v4 PWA; `/` citizen form, `/dashboard` dispatcher, `/analytics`.
- `docker/` — Dockerfiles and nginx config. `docs/` — project proposal and presentation.

See `CLAUDE.md` for architecture notes and the reasoning behind non-obvious decisions.
