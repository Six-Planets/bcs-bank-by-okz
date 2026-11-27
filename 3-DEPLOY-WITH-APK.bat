@echo off
title BCS Bank by OKZ - One-Click Website + Android APK Release
cd /d "%~dp0"
if not exist deploy\logs mkdir deploy\logs
echo ============================================================
echo   BCS Bank by OKZ (BBBOKZ) - Web + Signed Android APK Deploy
echo   (Rebuilds signed APK + triggers in-app update on old APKs)
echo ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '.\deploy\release.ps1' -Apk *>&1 | Tee-Object -FilePath ('deploy\logs\release-apk-' + (Get-Date -Format yyyyMMdd-HHmmss) + '.log')"
echo.
pause
