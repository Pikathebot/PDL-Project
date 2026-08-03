@echo off
TITLE Sentinel Platform Launcher
color 0A

echo ============================================================
echo         SENTINEL PUBLIC SAFETY PLATFORM LAUNCHER            
echo ============================================================
echo.

:: Check Docker Daemon
docker info >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Docker daemon detected.
    echo Starting Sentinel containers via Docker Compose...
    echo.
    docker compose -f docker-compose.dev.yml up -d
    echo.
    echo [INFO] Infrastructure services (PostgreSQL, Redis, MinIO) started.
) else (
    echo [WARNING] Docker daemon is not running or not installed.
    echo Proceeding with standalone local Python and Node execution...
    echo.
)

:: Check Virtual Environment
if not exist ".venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv .venv
    echo [INFO] Installing Python backend dependencies...
    call .venv\Scripts\pip install -r backend\requirements.txt
)

:: Ensure aiofiles is installed
call .venv\Scripts\pip install aiofiles >nul 2>&1

:: Check Frontend node_modules
if not exist "frontend\node_modules" (
    echo [INFO] Installing Frontend npm dependencies...
    cmd /c "cd frontend && npm install"
)

echo.
echo ============================================================
echo Launching Services:
echo   - Backend Server: http://localhost:8000
echo   - Citizen and Dispatcher UI: http://localhost:5173
echo ============================================================
echo.

:: Launch Backend
start "Sentinel FastAPI Backend" cmd /k ".venv\Scripts\python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000"

:: Launch Frontend
start "Sentinel React Frontend" cmd /k "cd frontend && npm run dev"

echo All services launched!
echo Open http://localhost:5173 in your browser.
echo.
pause
