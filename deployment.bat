@echo off
title SciComm Spark - Production Build ^& Deployment
color 0A

echo ============================================================
echo   SciComm Spark - Production Build ^& Deployment Script
echo ============================================================
echo.

rem Configure Git path in environment session
set PATH=C:\Users\amage\AppData\Roaming\kimi-desktop\daimon-bundle\runtime\git\cmd;%PATH%

echo [1/4] Building production bundle with Vite...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Build failed! Please fix compilation errors.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/4] Staging and committing all project changes...
git add .
git commit -m "feat(deploy): update production deployment and gh-pages live site"

echo.
echo [3/4] Pushing updates to GitHub (main branch)...
git push origin main

echo.
echo [4/4] Deploying dist assets to GitHub Pages (gh-pages branch)...
git checkout -B gh-pages-deploy-temp
git add -f dist
git commit -m "Deploy dist build to gh-pages"
for /f "tokens=*" %%t in ('git subtree split --prefix dist gh-pages-deploy-temp') do set TREE_HASH=%%t
git push -f origin %TREE_HASH%:refs/heads/gh-pages
git checkout main
git branch -D gh-pages-deploy-temp

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Git push failed. Please log in when prompted or check repository permissions.
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================================
echo   SUCCESS! Deployment complete on main ^& gh-pages!
echo ============================================================
pause
