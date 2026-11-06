@echo off
rem Deja las variables VITE_* del build en Cloudflare como las necesitamos
rem (Worker weddingskya y Pages weddingkya). No despliega nada.
rem Pide los datos por consola, no los guarda y los borra al terminar.
chcp 65001 >nul
cd /d "%~dp0.."
set "CF_ACCOUNT_ID="
set "CF_API_TOKEN="
echo.
set /p "CF_ACCOUNT_ID=1/2  Account ID (Enter para que lo detecte solo): "
set /p "CF_API_TOKEN=2/2  API Token: "
echo.
node scripts\cloudflare-config.mjs
set "CF_ACCOUNT_ID="
set "CF_API_TOKEN="
echo.
echo Resumen guardado en cloudflare-config.log
pause
