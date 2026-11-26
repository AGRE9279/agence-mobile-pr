@echo off
title Agence mobile Pro
cd /d "%~dp0"
echo.
echo  ==========================================
echo   AGENCE MOBILE PRO
echo  ==========================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo  ERREUR : Python n'est pas installe.
  pause
  exit /b
)
start "" /b python -m http.server 8081 --bind 127.0.0.1
timeout /t 3 /nobreak >nul
start "" "http://localhost:8081/index.html"
echo  L'appli est ouverte : http://localhost:8081/index.html
echo.
echo  NE FERMEZ PAS cette fenetre pendant l'utilisation.
echo.
pause >nul
