@echo off
rem Publica la plataforma en el Worker weddingskya (invitation.kdealbap.com y
rem subdominios de eventos). Publica EXACTAMENTE el último commit: compila en una
rem copia limpia (git worktree), así lo que esté a medio editar no llega a nadie.
rem Pide los datos por consola, no los guarda y los borra al terminar.
chcp 65001 >nul
cd /d "%~dp0.."
set "REPO=%CD%"
set "COPIA=%TEMP%\invitation-deploy"

set "CLOUDFLARE_ACCOUNT_ID="
set "CLOUDFLARE_API_TOKEN="
echo.
for /f "delims=" %%c in ('git log -1 --format^="%%h %%s"') do echo  Se publicará: %%c
echo.
set /p "CLOUDFLARE_ACCOUNT_ID=1/2  Account ID: "
set /p "CLOUDFLARE_API_TOKEN=2/2  API Token: "
echo.

rem Primero se suelta el enlace a node_modules: borrar la copia con él puesto
rem podría llevarse el node_modules real.
rmdir "%COPIA%\node_modules" >nul 2>&1
if exist "%COPIA%" git worktree remove --force "%COPIA%" >nul 2>&1
if exist "%COPIA%" rmdir /s /q "%COPIA%"
git worktree add --detach "%COPIA%" HEAD > "%REPO%\desplegar.log" 2>&1 || goto :fallo
rem .env (llaves de Supabase) no está en git; node_modules se enlaza, no se reinstala
copy /y "%REPO%\.env" "%COPIA%\.env" >nul || goto :fallo
mklink /J "%COPIA%\node_modules" "%REPO%\node_modules" >nul || goto :fallo

pushd "%COPIA%"
call npm run build >> "%REPO%\desplegar.log" 2>&1 || (popd & goto :fallo)
call npx --yes wrangler@4 deploy >> "%REPO%\desplegar.log" 2>&1 || (popd & goto :fallo)
git log -1 --format="Publicado: %%h %%s" >> "%REPO%\desplegar.log"
popd
type "%REPO%\desplegar.log"
echo.
echo  Publicado. Resumen en desplegar.log
goto :fin

:fallo
type "%REPO%\desplegar.log"
echo.
echo  Falló la publicación. Detalle en desplegar.log

:fin
rmdir "%COPIA%\node_modules" >nul 2>&1
git worktree remove --force "%COPIA%" >nul 2>&1
set "CLOUDFLARE_ACCOUNT_ID="
set "CLOUDFLARE_API_TOKEN="
pause
