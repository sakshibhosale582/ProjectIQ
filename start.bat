@echo off
REM Windows: installs dependencies (first run) and starts backend + frontend in two windows.
cd /d "%~dp0"
if not exist backend\.env (
  echo Create backend\.env first: copy backend\.env.example to backend\.env and fill it in.
  pause
  exit /b 1
)
if not exist .env copy .env.example .env >nul
if not exist node_modules call npm install
if not exist backend\node_modules (cd backend && call npm install && cd ..)
start "ProjectIQ Backend" cmd /k "cd backend && npm start"
start "ProjectIQ Frontend" cmd /k "npm run dev"
echo.
echo Open http://localhost:5173 in your browser.
pause
