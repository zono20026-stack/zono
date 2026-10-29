@echo off
title Open Port 5000 in Windows Firewall
chcp 65001 >nul
echo ========================================================
echo   جاري فتح المنفذ 5000 في جدار الحماية (Windows Firewall)
echo ========================================================
echo.
netsh advfirewall firewall add rule name="ZONO ERP Port 5000" dir=in action=allow protocol=TCP localport=5000
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ تم فتح المنفذ 5000 بنجاح!
    echo يمكنك الآن فتح الرابط التالي من الموبايل المتصل بنفس الواي فاي:
    echo http://192.168.1.2:5000
) else (
    echo.
    echo ⚠️ يرجى الضغط كليك يمين على هذا الملف واختيار:
    echo "Run as administrator" (التشغيل كمسؤول)
)
echo.
pause
