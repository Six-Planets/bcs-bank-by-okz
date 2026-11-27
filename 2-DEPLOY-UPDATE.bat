@echo off
title BCS Bank by OKZ - One-Click Website Update
cd /d "%~dp0"
if not exist deploy\logs mkdir deploy\logs
echo ============================================================
echo   BCS Bank by OKZ (BBBOKZ) - One-Click Web Update Deploy
echo   (Auto-bumps version, builds, pushes to Vercel + Pages)
echo ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '.\deploy\release.ps1' *>&1 | Tee-Object -FilePath ('deploy\logs\release-' + (Get-Date -Format yyyyMMdd-HHmmss) + '.log')"
echo.
pause
