@echo off
TITLE Sentinel Platform Launcher
color 0A

echo ============================================================
echo         SENTINEL PUBLIC SAFETY PLATFORM LAUNCHER            
echo ============================================================
echo.

:: Check if Docker is installed and running
docker info >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo [OK] Docker daemon detected.
    echo Starting Sentinel containers via Docker Compose...
    echo.
    docker compose -f docker-compose.dev.yml up -d
    echo.
    echo [INFO] Infrastructure services (PostgreSQL, Redis, MinIO) started.
) ELSE (
    echo [WARNING] Docker daemon is not running or not installed.
    echo Proceeding with standalone local Python & Node execution...
    echo.
)

:: Check if virtual environment exists
IF NOT EXIST ".venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv .venv
    echo [INFO] Installing Python backend dependencies...
    call .venv\Scripts\pip install -r backend\requirements.txt
)

:: Ensure aiofiles is installed
call .venv\Scripts\pip install aiofiles >nul 2>&1

:: Check node_modules in frontend
IF NOT EXIST "frontend\node_modules" (
    echo [INFO] Installing Frontend npm dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo ============================================================
echo Launching Services:
echo   - Backend Server: http://localhost:8000
echo   - Citizen & Dispatcher UI: http://localhost:5173
echo ============================================================
echo.

:: Start FastAPI Backend Server in a new window
start "Sentinel FastAPI Backend" cmd /k ".venv\Scripts\python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000"

:: Start Frontend Vite Dev Server in a new window
start "Sentinel React Frontend" cmd /k "cd frontend && npm run dev"

echo All services launched!
echo Open http://localhost:5173 in your browser.
echo.
pause
