@echo off
echo ========================================
echo LinkedIn-Style Currency System Setup
echo ========================================
echo.

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)
echo.

echo [2/3] Verifying files...
if not exist "src\middlewares\currencyMiddleware.js" (
    echo ERROR: currencyMiddleware.js not found
    pause
    exit /b 1
)
if not exist "src\config\currencyDisplay.js" (
    echo ERROR: currencyDisplay.js not found
    pause
    exit /b 1
)
echo All files verified successfully!
echo.

echo [3/3] Setup complete!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Run: npm start
echo 2. Visit: http://localhost:3000/pricing
echo 3. Check console for currency detection
echo.
echo Read LINKEDIN_CURRENCY_IMPLEMENTATION.md for details
echo ========================================
pause
