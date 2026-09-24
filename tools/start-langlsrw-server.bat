@echo off
setlocal
for %%I in ("%~dp0..") do set "APP_DIR=%%~fI"
cd /d "%APP_DIR%"
echo langLSRW local server starting...
echo Serving folder:
echo %APP_DIR%
echo.
echo Checking port 8848...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$listeners = @(netstat -ano | Select-String ':8848\s+.*LISTENING\s+(\d+)\s*$' | ForEach-Object { if ($_.Matches.Count) { [int]$_.Matches[0].Groups[1].Value } } | Sort-Object -Unique);" ^
  "$blocked = $false;" ^
  "foreach ($pidValue in $listeners) {" ^
  "  $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $pidValue) -ErrorAction SilentlyContinue;" ^
  "  $fallback = Get-Process -Id $pidValue -ErrorAction SilentlyContinue;" ^
  "  if (-not $p -and -not $fallback) { continue }" ^
  "  $isHttpServer = ($p -and $p.CommandLine -match 'python' -and $p.CommandLine -match 'http\.server');" ^
  "  $isPythonListener = (-not $p -and $fallback.ProcessName -match '^(python|pythonw|py)$');" ^
  "  if ($isHttpServer -or $isPythonListener) {" ^
  "    Write-Host ('Stopping old Python http.server on port 8848, PID ' + $pidValue + '...');" ^
  "    Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue;" ^
  "  } else {" ^
  "    Write-Host ('Port 8848 is used by another process, PID ' + $pidValue + ':');" ^
  "    if ($p) { Write-Host $p.CommandLine } else { Write-Host $fallback.ProcessName }" ^
  "    $blocked = $true;" ^
  "  }" ^
  "}" ^
  "if ($blocked) { exit 2 }"
if errorlevel 2 (
  echo.
  echo Close that program or change the port in this script.
  echo.
  pause
  exit /b 1
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


