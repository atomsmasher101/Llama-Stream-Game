@echo off
powershell -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory 'C:\Users\littl\Llama Game NN\server'"
echo Server started in background