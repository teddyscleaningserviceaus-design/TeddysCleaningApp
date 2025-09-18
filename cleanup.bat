@echo off
echo 🧹 Cleaning Expo + React Native build junk...

REM Android build artifacts
if exist android\app\build rd /s /q android\app\build
if exist android\build rd /s /q android\build

REM Gradle caches
if exist "%USERPROFILE%\.gradle\caches" rd /s /q "%USERPROFILE%\.gradle\caches"
if exist "%USERPROFILE%\.gradle\daemon" rd /s /q "%USERPROFILE%\.gradle\daemon"
if exist "%USERPROFILE%\.gradle\native" rd /s /q "%USERPROFILE%\.gradle\native"

REM Metro cache
if exist "%TEMP%\metro-*" del /q "%TEMP%\metro-*"
if exist "%TEMP%\haste-map-*" del /q "%TEMP%\haste-map-*"

REM React Native packager cache
if exist node_modules\.cache rd /s /q node_modules\.cache

echo ✅ Cleanup complete!
pause
