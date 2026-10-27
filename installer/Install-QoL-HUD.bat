@echo off
setlocal
title QoL HUD for Deadlock
set "URL=https://raw.githubusercontent.com/Liqudity2provider/deadlock-qol-mods/master/installer/install.ps1"
echo.
echo   QoL HUD for Deadlock
echo   ====================
echo   1. Install / update / repair after a game patch
echo   2. Check and make a report (send it to the author)
echo   3. Uninstall
echo.
choice /c 123 /n /m "  Press 1, 2 or 3: "
set "ACT=install"
if errorlevel 2 set "ACT=report"
if errorlevel 3 set "ACT=uninstall"
echo.
if exist "%~dp0install.ps1" goto local
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $s=Invoke-RestMethod -UseBasicParsing '%URL%'; & ([scriptblock]::Create($s)) -Action %ACT%"
goto done
:local
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Action %ACT%
:done
echo.
pause
