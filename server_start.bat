@echo off
powershell -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory 'C:\Users\littl\Llama-Stream-Game\server'"
echo Server started in background