@echo off
title Sistema de Roadmaps
cd /d "%~dp0"

if not exist "node_modules\" (
    echo Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo Erro ao instalar dependencias. Verifique se o Node.js esta instalado.
        pause
        exit /b 1
    )
)

echo.
echo Verificando porta 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Encerrando servidor anterior ^(PID %%a^)...
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo.
echo Iniciando servidor...
echo.
call npm start

pause
