@echo off
title ZONO ERP - Mobile Cloudflare Tunnel
chcp 65001 >nul
echo ========================================================
echo   🚀 ZONO Enterprise Shipping ERP - رابط الموبايل السحابي
echo ========================================================
echo جاري إنشاء رابط سحابي آمن (HTTPS) للموبايل...
echo.
"%~dp0cloudflared.exe" tunnel --url http://localhost:5000
pause
