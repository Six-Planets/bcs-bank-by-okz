@echo off
rem BCS Bank by OKZ - Deploy
rem Website (Vercel + GitHub Pages) + signed Android APK (GitHub Releases), then checks the live site.
rem Optional message:  "BCS Bank by OKZ - Deploy.bat" "what changed"
title BCS Bank by OKZ - Deploy
cd /d "%~dp0"
if not exist deploy\logs mkdir deploy\logs
set "MSG=%~1"
set "PSMSG="
if defined MSG set "PSMSG=%MSG:'=''%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '.\deploy\deploy-all.ps1' -Message '%PSMSG%' *>&1 | Tee-Object -FilePath ('deploy\logs\deploy-' + (Get-Date -Format yyyyMMdd-HHmmss) + '.log')"
set "RC=%errorlevel%"
if not defined npm_lifecycle_event if "%~1"=="" (echo. & pause)
exit /b %RC%
