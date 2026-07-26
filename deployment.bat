@echo off
title SciComm Spark - Production Build ^& Deployment
color 0A

echo ============================================================
echo   SciComm Spark - Production Build ^& Deployment Script
echo ============================================================
echo.

rem Configure Git path in environment session
set PATH=C:\Users\amage\AppData\Roaming\kimi-desktop\daimon-bundle\runtime\git\cmd;%PATH%

echo [1/3] Building production bundle with Vite...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Build failed! Please fix compilation errors.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Staging and committing all project changes...
git add .
git commit -m "feat(deploy): update production deployment and global state fixes"

echo.
echo [3/3] Pushing updates to GitHub (main branch)...
git push origin main

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Git push failed. Please log in when prompted or check repository permissions.
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================================
echo   SUCCESS! Deployment complete and pushed to GitHub!
echo ============================================================
pause
