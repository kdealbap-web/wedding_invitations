@echo off
rem Conecta los dominios de la plataforma al Worker en Cloudflare.
rem Pide el token por consola, no lo guarda y lo borra al terminar.
rem Uso: doble clic, o  scripts\cloudflare-dominios.bat --solo-revisar
chcp 65001 >nul
cd /d "%~dp0.."
set "CF_API_TOKEN="
set /p "CF_API_TOKEN=Pega el token de Cloudflare y presiona Enter: "
node scripts\cloudflare-dominios.mjs %*
set "CF_API_TOKEN="
echo.
echo Resumen guardado en cloudflare-dominios.log
pause
