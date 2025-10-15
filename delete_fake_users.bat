@echo off
setlocal enabledelayedexpansion
echo ===================================================
echo   🧹 MongoDB Fake User Cleanup Tool
echo ===================================================
echo.

:: MongoDB connection string
set MONGO_URI="mongodb+srv://nowdib_db_user:u2wz2J5OPPk8G4sL@cluster0.jqqe2wo.mongodb.net/products?retryWrites=true&w=majority&appName=Cluster0"

echo 🔍 Step 1: Counting fake users...
echo.

:: Count fake users first
mongosh %MONGO_URI% --eval "db.users.countDocuments({ $or: [ { email: { $regex: 'render', $options: 'i' } }, { email: { $regex: '@instance\.com$', $options: 'i' } } ] })" > temp_count.txt 2>&1

if errorlevel 1 (
   echo ❌ Error connecting to MongoDB. Please check your connection string and network.
   goto cleanup
)

set /p FAKE_COUNT=<temp_count.txt
del temp_count.txt

echo 📊 Found !FAKE_COUNT! fake user(s) matching criteria:
echo    • Email contains "render" (case-insensitive)
echo    • Email ends with "@instance.com" (case-insensitive)
echo.

:: Ask for confirmation
set CONFIRM=N
echo ⚠️  WARNING: This will permanently delete !FAKE_COUNT! user(s) from your database.
echo.
set /p CONFIRM="Do you want to proceed with deletion? (Y/N): "

if /i "!CONFIRM!" neq "Y" (
   echo.
   echo ✅ Deletion cancelled by user.
   goto cleanup
)

echo.
echo 🗑️  Step 2: Deleting fake users...
echo.

:: Perform the deletion
mongosh %MONGO_URI% --eval "db.users.deleteMany({ $or: [ { email: { $regex: 'render', $options: 'i' } }, { email: { $regex: '@instance\.com$', $options: 'i' } } ] })" > temp_delete.txt 2>&1

if errorlevel 1 (
   echo ❌ Error during deletion. Please check your connection and permissions.
   goto cleanup
)

:: Read deletion result
for /f "tokens=*" %%i in (temp_delete.txt) do (
   set DELETE_RESULT=%%i
   goto parse_result
)

:parse_result
del temp_delete.txt

echo.
echo ---------------------------------------------------
echo ✅ SUCCESS: Fake users deleted successfully!
echo.
echo 📈 Deletion Summary:
echo    • Users found and deleted: !FAKE_COUNT!
echo    • Database: products
echo    • Collection: users
echo ---------------------------------------------------
echo.
echo 💡 Tip: You can run this script again to verify no fake users remain.

:cleanup
echo.
pause
