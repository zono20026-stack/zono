@echo off
setlocal
chcp 65001 >nul
title ZONO Delivery ERP - Launcher

echo ========================================================
echo   ZONO Enterprise Shipping ERP Launcher
echo ========================================================

:: 1. Check PostgreSQL on port 5435
netstat -ano -p tcp | findstr ":5435 " | findstr "LISTENING" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [1/2] Starting database on port 5435...
    start "ZONO-DB" /MIN "C:\Program Files\PostgreSQL\16\bin\postgres.exe" -D "G:\transport\pgdata"
    ping -n 4 127.0.0.1 >nul
) else (
    echo [1/2] Database is running on port 5435.
)

:: 2. Check Application Server on port 5000
netstat -ano -p tcp | findstr ":5000 " | findstr "LISTENING" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [2/2] Starting backend server on port 5000...
    start "ZONO-Server" /MIN cmd /c "cd /d G:\transport\server && npm start"
    ping -n 4 127.0.0.1 >nul
) else (
    echo [2/2] Backend server is running on port 5000.
)

echo.
echo Launching application in browser: http://localhost:5000
start "" "http://localhost:5000"

endlocal
exit /b 0
