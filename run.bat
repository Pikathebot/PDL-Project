@echo off
TITLE Sentinel Platform Launcher
color 0A

echo ============================================================
echo         SENTINEL PUBLIC SAFETY PLATFORM LAUNCHER            
echo ============================================================
echo.

docker info >nul 2>&1
if %errorlevel% neq 0 goto NODOCKER

echo [OK] Docker daemon detected.
echo Starting Sentinel containers via Docker Compose...
echo.
docker compose -f docker-compose.dev.yml up -d
echo.
echo [INFO] Infrastructure services started.
goto CHECKVENV

:NODOCKER
echo [WARNING] Docker daemon is not running or not installed.
echo Proceeding with standalone local Python and Node execution...
echo.

:CHECKVENV
if exist ".venv" goto CHECKFRONTEND

echo [INFO] Creating Python virtual environment...
python -m venv .venv
echo [INFO] Installing Python backend dependencies...
call .venv\Scripts\pip install -r backend\requirements.txt

:CHECKFRONTEND
call .venv\Scripts\pip install aiofiles >nul 2>&1

if exist "frontend\node_modules" goto LAUNCH

echo [INFO] Installing Frontend npm dependencies...
cd frontend
call npm install
cd ..

:LAUNCH
echo.
echo ============================================================
echo Launching Services:
echo   - Backend Server: http://localhost:8000
echo   - Citizen and Dispatcher UI: http://localhost:5173
echo ============================================================
echo.

start "Sentinel FastAPI Backend" cmd /k ".venv\Scripts\python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000"
start "Sentinel React Frontend" cmd /k "cd frontend && npm run dev"

echo All services launched!
echo Open http://localhost:5173 in your browser.
echo.
pause
