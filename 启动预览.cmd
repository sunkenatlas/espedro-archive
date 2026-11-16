@echo off
cd /d "%~dp0"
node scripts/build.mjs
if errorlevel 1 (
  echo Build failed. Check that Node.js 22 or newer is installed.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4175/ in your browser.
echo Press Ctrl+C to stop the preview server.
node scripts/serve.mjs --open
pause
