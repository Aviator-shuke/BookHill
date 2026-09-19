@echo off
setlocal
for %%I in ("%~dp0.") do set "APP_DIR=%%~fI"
cd /d "%APP_DIR%"
echo langLSRW local server starting...
echo Serving folder:
echo %APP_DIR%
echo.
echo Checking port 8848...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":8848 .*LISTENING"') do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-CimInstance Win32_Process -Filter 'ProcessId=%%P'; if ($p -and $p.CommandLine -match 'python' -and $p.CommandLine -match 'http\.server') { Write-Host 'Stopping old Python http.server on port 8848, PID %%P...'; Stop-Process -Id %%P -Force; exit 0 } else { Write-Host 'Port 8848 is used by another process, PID %%P:'; if ($p) { Write-Host $p.CommandLine } else { Write-Host 'Unknown process' }; exit 2 }"
  if errorlevel 2 (
    echo.
    echo Close that program or change the port in this script.
    echo.
    pause
    exit /b 1
  )
)
echo.
echo Open this address in Chrome or Edge:
echo http://localhost:8848/
echo.
echo Keep this window open while using langLSRW.
echo Press Ctrl+C to stop the server.
echo.
py -m http.server 8848 --directory "%APP_DIR%"
if errorlevel 1 (
  echo.
  echo "py" was not found. Trying "python"...
  python -m http.server 8848 --directory "%APP_DIR%"
)
if errorlevel 1 (
  echo.
  echo langLSRW server did not start. Port 8848 may already be in use.
  echo Close the old server window, then run this file again.
  echo.
  pause
)

