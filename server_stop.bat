@echo off
echo Stopping server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo Server stopped