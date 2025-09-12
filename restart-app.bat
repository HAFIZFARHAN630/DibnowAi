@echo off
echo Clearing Node.js cache and restarting...
echo.

echo Stopping any running Node processes...
taskkill /f /im node.exe 2>nul

echo Clearing npm cache...
npm cache clean --force

echo Restarting the application...
npm start

pause