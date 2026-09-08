@echo off
title SmartAttend Build Tool
cls
echo ===================================================
echo   SmartAttend - React Native Build System
echo ===================================================
echo.
echo Select build target:
echo.
echo   [1] Build Android Release APK  (Recommended for sharing APK)
echo   [2] Build Android Debug APK    (For rapid testing on device)
echo   [3] Build Android App Bundle   (AAB for Play Store upload)
echo   [4] Build Web Bundle           (Static web files)
echo   [5] Clean Build Cache          (Fix compilation errors)
echo   [6] Exit
echo.
set /p choice="Enter choice (1-6): "

if "%choice%"=="1" (
    node scripts/build.js apk
) else if "%choice%"=="2" (
    node scripts/build.js debug
) else if "%choice%"=="3" (
    node scripts/build.js bundle
) else if "%choice%"=="4" (
    node scripts/build.js web
) else if "%choice%"=="5" (
    node scripts/build.js clean
) else if "%choice%"=="6" (
    exit /b 0
) else (
    echo.
    echo Invalid selection.
)

pause
