@echo off
echo ============================================
echo Llama AI Training Server - Windows Service
echo ============================================
echo.

REM Change to script directory
cd /d "%~dp0"

echo Running from: %CD%
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo.
echo Starting server...
echo.

if "%1"=="--install" goto install
if "%1"=="--uninstall" goto uninstall
if "%1"=="--service" goto runservice
if "%1"=="--startup" goto startup

echo To run in foreground (Ctrl+C to stop):
echo   node server.js
echo.
echo To install as Windows Service (run as Administrator):
echo   install-llama-ai-server.bat --install
echo.
echo To add to Windows Startup (runs headless):
echo   install-llama-ai-server.bat --startup
echo.
echo To uninstall:
echo   install-llama-ai-server.bat --uninstall
echo.
echo Starting in foreground mode...
node server.js
pause
exit /b 0

:runservice
REM Run headless - hide console window
start /b node server.js >nul 2>&1
exit /b 0

:startup
echo Adding to Windows Startup (runs headless)...
echo.

REM Create a VBScript to run node without console window
echo Set WshShell = CreateObject("WScript.Shell") > "%~dp0runheadless.vbs"
echo WshShell.Run """%~dp0node.cmd""", 0, False >> "%~dp0runheadless.vbs"

REM Create a batch file that the VBScript will call
echo @echo off > "%~dp0node.cmd"
echo cd /d "%%~dp0" >> "%~dp0node.cmd"
echo start /b node server.js ^>nul 2^>^&1 >> "%~dp0node.cmd"

REM Add to current user's startup
copy /y "%~dp0runheadless.vbs" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\LlamaAI.vbs" >nul 2>&1

echo Added to Windows Startup!
echo Server will run headlessly on next login.
echo.
echo To start now without waiting for login:
start /b node server.js
echo Started!
pause
exit /b 0

:install
echo Installing Llama AI Server as Windows Service...
echo.

REM Check for administrator privileges
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: Administrator privileges required!
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Create the service using schtasks - runs at system startup
schtasks /create /tn "LlamaAIServer" /tr "\"%~dp0install-llama-ai-server.bat\" --service" /sc onstart /f /rl HIGHEST >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to create scheduled task
    pause
    exit /b 1
)

echo Service installed successfully!
echo Starting the service...
schtasks /run /tn "LlamaAIServer" >nul 2>&1
echo Done!
pause
exit /b 0

:uninstall
echo Uninstalling Llama AI Server...
echo.

REM Remove from startup first
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\LlamaAI.vbs" >nul 2>&1
del /f /q "%~dp0runheadless.vbs" >nul 2>&1
del /f /q "%~dp0node.cmd" >nul 2>&1

REM Stop scheduled task if exists
schtasks /end /tn "LlamaAIServer" >nul 2>&1
schtasks /delete /tn "LlamaAIServer" /f >nul 2>&1

echo Service uninstalled!
echo Removed from Windows Startup!
pause
exit /b 0
