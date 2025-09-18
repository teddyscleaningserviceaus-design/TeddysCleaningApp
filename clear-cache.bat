@echo off
echo Clearing React Native and Metro cache...

echo Stopping Metro bundler...
taskkill /f /im node.exe 2>nul

echo Clearing Metro cache...
npx react-native start --reset-cache

echo Cache cleared! You can now restart your app.
pause