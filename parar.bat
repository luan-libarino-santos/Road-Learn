@echo off
title Parando Sistema de Roadmaps...
echo Encerrando servidor na porta 3000...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING" 2^>nul') do (
    echo Encerrando PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo Servidor encerrado.
timeout /t 2 /nobreak >nul
