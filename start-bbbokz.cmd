@echo off
title BCS Bank by OKZ (BBBOKZ) - Localhost Launcher
cd /d "%~dp0"

echo ========================================================
echo   BCS Bank by OKZ (BBBOKZ) - Starting Localhost...
echo ========================================================

netstat -ano | findstr ":5174 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo [OK] Localhost server is already running on http://127.0.0.1:5174/
) else (
  echo [INFO] Starting Vite server on http://127.0.0.1:5174/ ...
  start "BBBOKZ Vite Server" cmd /k "cd /d "%~dp0" && npx vite --port 5174 --host 0.0.0.0"
  timeout /t 3 /nobreak >nul
)

echo [INFO] Opening http://127.0.0.1:5174/ in your browser...
start "" "http://127.0.0.1:5174/"
exit /b 0
