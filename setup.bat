@echo off
title DownTube - Installation
color 0A

echo.
echo ==========================================
echo             DOWNTUBE SETUP
echo ==========================================
echo.

cd /d "%~dp0"

if not exist "bin" mkdir "bin"

echo.
echo [1/2] Telechargement de yt-dlp...
echo.

curl.exe -L ^
    -o "bin\yt-dlp.exe" ^
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"

if not exist "bin\yt-dlp.exe" (
    echo.
    echo ERREUR : impossible de telecharger yt-dlp.
    echo.
    pause
    exit /b 1
)

echo.
echo yt-dlp installe avec succes.
echo.


echo.
echo [2/2] Verification de yt-dlp...
echo.

"bin\yt-dlp.exe" --version

if errorlevel 1 (
    echo.
    echo ERREUR : yt-dlp ne fonctionne pas.
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Installation terminee !
echo ==========================================
echo.
echo Fichier :
echo %cd%\bin\yt-dlp.exe
echo.
echo Tu peux maintenant lancer :
echo npm start
echo.

pause