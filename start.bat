@echo off
title SciComm Spark - Local Development Server
color 0B

echo ============================================================
echo   SciComm Spark - Launching Local Development Server
echo ============================================================
echo.

cd /d "c:\Users\amage\OneDrive - Alamein International University\Ai Projects\Science Communication Spark"

echo [1/2] Opening browser preview at http://localhost:5173...
start "" "http://localhost:5173"

echo.
echo [2/2] Starting Vite Development Server (npm run dev)...
echo Press Ctrl+C at any time to stop the server.
echo ============================================================
echo.

call npm run dev

pause
