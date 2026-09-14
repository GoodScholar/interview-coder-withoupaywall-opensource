@echo off
setlocal
cd /D "%~dp0"
if errorlevel 1 exit /b %errorlevel%

echo === Interview Coder (No Paywall) ===
echo Use Ctrl+B to toggle window visibility.
echo Building application...

rem The build command cleans generated files. Preserve local configuration.
call npm run build
if errorlevel 1 exit /b %errorlevel%

echo Starting application. Keep this terminal open while using the app.
call npm run run-prod
exit /b %errorlevel%
