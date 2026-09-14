@echo off
TITLE Sentinel Platform Launcher
color 0A
cd /d "%~dp0"

echo ============================================================
echo         SENTINEL PUBLIC SAFETY PLATFORM LAUNCHER
echo ============================================================
echo.

REM ---- Local LLM (llama.cpp llama-server, OpenAI-compatible on :8080) ----
REM Set these to start llama-server automatically. Leave LLAMA_MODEL_GGUF
REM blank to skip; the pipeline then records the LLM as unavailable.
if not defined LLAMA_SERVER_EXE set "LLAMA_SERVER_EXE=%LOCALAPPDATA%\llama.cpp\cuda-b10809\llama-server.exe"
if not defined LLAMA_MODEL_GGUF set "LLAMA_MODEL_GGUF=D:\JARVIS\models\Qwen3.5-4B-UD-Q4_K_XL.gguf"

set "PYTHONPATH=%~dp0"
set "PY=.venv\Scripts\python.exe"

REM ---- Python / Node dependencies ----
if not exist ".venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv .venv
    echo [INFO] Installing Python backend dependencies...
    call %PY% -m pip install -r backend\requirements.txt
)
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend npm dependencies...
    pushd frontend && call npm install && popd
)

REM ---- Infrastructure: Docker (Postgres/Redis/MinIO + Celery) or standalone ----
docker info >nul 2>&1
if %errorlevel% neq 0 goto STANDALONE

echo [OK] Docker daemon detected - starting Postgres, Redis, MinIO...
docker compose -f docker-compose.dev.yml up -d
echo [INFO] Waiting for Postgres...
:WAITPG
docker exec sentinel-postgres-dev pg_isready -U postgres >nul 2>&1 || (timeout /t 2 /nobreak >nul & goto WAITPG)
set "AI_PROCESSING_MODE=celery"
set "DATABASE_URL="
set "MODE=Docker (Postgres + Redis + Celery worker)"
goto LLM

:STANDALONE
echo [WARN] Docker not running - standalone mode: SQLite database, AI runs inline in the API process.
set "AI_PROCESSING_MODE=inline"
set "DATABASE_URL=sqlite+aiosqlite:///./sentinel_dev.db"
set "MODE=Standalone (SQLite, inline AI)"

:LLM
if "%LLAMA_MODEL_GGUF%"=="" goto SEED
if not exist "%LLAMA_SERVER_EXE%" (
    echo [WARN] llama-server not found at %LLAMA_SERVER_EXE% - LLM extraction will be unavailable.
    goto SEED
)
if not exist "%LLAMA_MODEL_GGUF%" (
    echo [WARN] Model not found at %LLAMA_MODEL_GGUF% - LLM extraction will be unavailable.
    goto SEED
)
echo [INFO] Starting llama-server with %LLAMA_MODEL_GGUF%
start "Sentinel LLM (llama-server)" "%LLAMA_SERVER_EXE%" -m "%LLAMA_MODEL_GGUF%" --port 8080 -c 4096 -ngl 99
echo [INFO] Waiting for llama-server...
:WAITLLM
curl -s -m 2 http://localhost:8080/health | find "ok" >nul 2>&1 || (timeout /t 2 /nobreak >nul & goto WAITLLM)

:SEED
REM Users + responders (idempotent). Demo incidents are seeded separately so
REM the queue can be reset without touching accounts:
REM     %PY% -m backend.app.db.seed_demo --reset
echo [INFO] Seeding users and responders...
call %PY% -m backend.app.db.seed
if "%SKIP_DEMO_SEED%"=="" (
    echo [INFO] Seeding demo incidents through the AI pipeline (skips if present, ~2 min first time)...
    call %PY% -m backend.app.db.seed_demo
)

REM ---- Launch services ----
echo.
echo ============================================================
echo Mode: %MODE%
echo   - Backend API:       http://localhost:8000/docs
echo   - Citizen PWA:       http://localhost:5173
echo   - Dispatcher:        http://localhost:5173/dashboard
echo ============================================================
echo.

if "%AI_PROCESSING_MODE%"=="celery" (
    REM --pool=solo: the default prefork pool does not work on Windows.
    start "Sentinel Celery Worker" cmd /k "%PY% -m celery -A backend.app.tasks.celery_app.celery_app worker --loglevel=info --pool=solo"
)
start "Sentinel FastAPI Backend" cmd /k "%PY% -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000"
start "Sentinel React Frontend" cmd /k "cd frontend && npm run dev"

echo All services launched. Open http://localhost:5173/dashboard
echo.
pause
