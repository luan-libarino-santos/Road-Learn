@echo off
title Reiniciando Sistema de Roadmaps...
cd /d "%~dp0"

echo Encerrando servidor anterior na porta 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING" 2^>nul') do (
    echo Encerrando PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul
echo Reiniciando em modo silencioso...
wscript.exe "%~dp0iniciar-silencioso.vbs"
echo Servidor reiniciado.
timeout /t 2 /nobreak >nul
