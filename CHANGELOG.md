# Changelog

All notable changes to the Sentinel project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `llamaserver` AI provider (llama.cpp `llama-server`, OpenAI-compatible) as the default LLM backend; grammar-enforced JSON extraction with an explicit `model_available` / `parsed` contract.
- Video evidence is analysed by sampling keyframes through YOLOv8; the best frame is served as the video poster on the dashboard.
- Standalone mode: `DATABASE_URL` (SQLite) + `AI_PROCESSING_MODE=inline` run the whole stack without Docker, Redis or a Celery worker.
- `seed_demo.py`: 18 Mumbai incidents with deliberate duplicate groups, pushed through the real pipeline.
- `dispatched_at` / `resolved_at` timestamps and average time-to-dispatch / time-to-resolve on the analytics page.
- `incident_ai_processed` WebSocket event plus a dashboard poll so AI results appear live.
- PWA icon set and manifest; installable from the dev server with `VITE_PWA_DEV=true`.
- Dispatcher authentication (JWT) guarding status changes and dispatch.
- `run.bat` now starts Celery / llama-server and seeds data; `ruff` replaces `flake8`.

### Removed
- MinIO service and settings (never used; uploads are local files served by the API).
- Hard-coded demo cluster in `seed.py` that claimed two reports with one member.
- Mock strings stored as LLM output; fabricated severities/confidences from unavailable models.

### Fixed
- Backend and Celery containers now share the `media_uploads` volume.
- `.env` provider settings (`LMSTUDIO_API_URL`, `OPENAI_*`) were never read.
- Thinking models returned empty content; `enable_thinking` is now disabled per request.

## [0.1.0] - initial scaffolding
- Project layout, git conventions, Makefile.
