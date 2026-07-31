# Sentinel: AI-Powered Public Safety & Incident Response Platform

Sentinel is a citizen-facing incident reporting Progressive Web App (PWA) paired with an AI-driven async processing pipeline and a dispatcher/responder authority dashboard. 

It classifies public safety hazards (accidents, fires, infrastructure failures, etc.) from citizen uploads using computer vision (YOLOv8) and structures transcription and incident descriptions using `gemma-4-e4b-qat` (Unsloth text-only) over an abstract AI provider bridge (supporting local llama.cpp, LM Studio, or OpenAI-compatible APIs).

## Core Architecture & Features
1. **Citizen PWA (Vite + React + Tailwind CSS v4)**: Mobile-first layout with camera, voice, and GPS geolocation capture.
2. **AI Provider Bridge**: Configurable adapter layer supporting local model loading (llama.cpp) or external APIs.
3. **Union-Find Clustering**: Merges duplicate reports of the same event based on time (2h), distance (200m), and semantic description embeddings.
4. **Heap Priority Queue**: Multi-factor priority sorting for dispatcher triage.
5. **k-d Tree Search**: Fast nearest-responder routing.
6. **Dispatcher Dashboard**: Real-time Leaflet map feed with WebSocket push notifications.
7. **Task Processing**: Celery asynchronous processing workers backed by Redis.

## Repository Layout
- `/frontend`: React + Vite PWA application.
- `/backend`: FastAPI Python server + Postgres/PostGIS + Alembic.
- `/ai_pipeline`: AI/ML wrappers, providers, text-only extractor, voice transcription, and spam/validation checks (Turnstile, EXIF, AI-generation checks).
- `/docker`: Dockerfiles and server config scripts.
- `/docs`: Architecture details, API routes, setup checklists.

## Quick Start
Please refer to the `docs/setup-guide.md` or start the full environment using:
```bash
docker-compose -f docker-compose.dev.yml up --build
```
