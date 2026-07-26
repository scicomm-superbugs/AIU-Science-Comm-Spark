@echo off
title SciComm Spark - Deploy to GitHub
color 0A

echo ============================================================
echo   SciComm Spark - Production Build ^& Deploy to GitHub
echo ============================================================
echo.

rem Add Git path to current environment session
set PATH=C:\Users\amage\AppData\Roaming\kimi-desktop\daimon-bundle\runtime\git\cmd;%PATH%

echo [1/3] Compiling Vite production build...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Build failed! Please fix compilation errors.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Adding and committing local changes...
git add .
git commit -m "fix(landing): deploy updates and persistence fixes"

echo.
echo [3/3] Pushing to GitHub repository (main branch)...
git push origin main

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Git push failed. Please log in when prompted or check write access.
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================================
echo   SUCCESS! All changes built and pushed to GitHub!
echo ============================================================
pause
