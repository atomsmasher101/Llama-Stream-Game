@echo off
echo Resetting Llama AI Gene Pool...

REM Stop the server using the existing stop script
call server_stop.bat

REM Wait a second for file handles to release
timeout /t 1 /nobreak >nul

REM Delete the networks data file
if exist server\networks.json (
    echo Deleting networks.json...
    del server\networks.json
) else (
    echo networks.json not found, skipping deletion.
)

REM Restart the server
call server_start.bat

echo.
echo Gene pool reset and server restarted successfully!
pause