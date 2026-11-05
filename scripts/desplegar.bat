@echo off
rem Publica la plataforma en el Worker weddingskya (invitation.kdealbap.com y
rem subdominios de eventos). Compila con .env + .env.production y sube dist/.
rem Pide los datos por consola, no los guarda y los borra al terminar.
chcp 65001 >nul
cd /d "%~dp0.."

rem Solo se publica lo commiteado: un cambio a medias no debe llegar a los invitados.
for /f %%i in ('git status --porcelain -- src public index.html') do (
  echo.
  echo  Hay cambios sin commitear en src/public. Commitea o descarta antes de publicar.
  git status --short -- src public index.html
  pause
  exit /b 1
)

set "CLOUDFLARE_ACCOUNT_ID="
set "CLOUDFLARE_API_TOKEN="
echo.
set /p "CLOUDFLARE_ACCOUNT_ID=1/2  Account ID: "
set /p "CLOUDFLARE_API_TOKEN=2/2  API Token: "
echo.
call npm run build > desplegar.log 2>&1 || goto :fallo
call npx --yes wrangler@4 deploy >> desplegar.log 2>&1 || goto :fallo
git log -1 --format="Publicado: %%h %%s" >> desplegar.log
type desplegar.log
echo.
echo  Publicado. Resumen en desplegar.log
goto :fin

:fallo
type desplegar.log
echo.
echo  Falló la publicación. Detalle en desplegar.log

:fin
set "CLOUDFLARE_ACCOUNT_ID="
set "CLOUDFLARE_API_TOKEN="
pause
