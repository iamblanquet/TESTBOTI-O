@echo off
title Sistema Offline-First con Bot de Telegram
echo ========================================================
echo   SISTEMA DE REPORTES OFFLINE-FIRST + TELEGRAM BOT
echo ========================================================
echo.
echo Iniciando Servidor Backend (Puerto 3001)...
start "Backend Server" cmd /k "cd backend && npm start"

timeout /t 2 > nul

echo Iniciando App Web / Movil Frontend (Puerto 5173)...
start "Frontend App" cmd /k "cd frontend && npm run dev -- --host"

echo.
echo ========================================================
echo   SERVICIOS INICIADOS:
echo   - App Movil / Frontend: http://localhost:5173
echo   - Backend REST API:     http://localhost:3001
echo ========================================================
echo.
pause
