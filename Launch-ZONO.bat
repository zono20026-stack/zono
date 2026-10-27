@echo off
title ZONO Delivery ERP - Launcher
chcp 65001 >nul
echo ========================================================
echo   🚀 ZONO Enterprise Shipping ERP (زونو لإدارة الشحن)
echo ========================================================
echo جاري التحقق من تشغيل السيرفر وقاعدة البيانات...

:: Check if postgres is running, if not start it
tasklist /FI "IMAGENAME eq postgres.exe" 2>NUL | find /I /N "postgres.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo [1/2] جاري تشغيل قاعدة البيانات...
    start "" /B "C:\Program Files\PostgreSQL\16\bin\postgres.exe" -D "G:\transport\pgdata"
    timeout /t 2 /nobreak >nul
) else (
    echo [1/2] قاعدة البيانات تعمل بالفعل.
)

:: Check if server port 5000 is open
netstat -ano | findstr :5000 >nul
if "%ERRORLEVEL%"=="1" (
    echo [2/2] جاري تشغيل خادم التطبيق...
    start "" /B cmd /c "cd /d G:\transport\server && npm start"
    timeout /t 3 /nobreak >nul
) else (
    echo [2/2] خادم التطبيق يعمل بالفعل.
)

echo.
echo ✅ تم التأكد من عمل كافة الخدمات بنجاح!
echo 🌐 جاري فتح واجهة التطبيق في المتصفح...
start "" "http://localhost:5000"

exit
