@echo off
rem BCS Bank by OKZ - Localhost
rem Double-click (or run from any terminal / IDE): starts the app at http://localhost:5174 with hot reload.
rem Already running? It just opens it. Installs packages only when needed. Frees port 5174 if stuck.
title BCS Bank by OKZ - Localhost
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy\localhost.ps1"
