@echo off
rem Conecta los dominios de la plataforma al Worker en Cloudflare.
rem Pide los datos por consola, no los guarda y los borra al terminar.
rem Uso: doble clic, o  scripts\cloudflare-dominios.bat --solo-revisar
chcp 65001 >nul
cd /d "%~dp0.."
set "CF_ACCOUNT_ID="
set "CF_API_TOKEN="
echo.
echo  Solo hacen falta dos datos. El Secret Access Key y el endpoint S3 son de R2
echo  (archivos) y no sirven para dominios: no los pegues.
echo.
set /p "CF_ACCOUNT_ID=1/2  Account ID (Enter para que lo detecte solo): "
set /p "CF_API_TOKEN=2/2  API Token: "
echo.
node scripts\cloudflare-dominios.mjs %*
set "CF_ACCOUNT_ID="
set "CF_API_TOKEN="
echo.
echo Resumen guardado en cloudflare-dominios.log
pause
