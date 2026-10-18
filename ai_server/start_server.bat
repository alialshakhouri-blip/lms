@echo off
chcp 65001 >nul
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║   BGTI LMS — AI Auto-Generation Server                  ║
echo  ║   الخادم الذكي لتوليد محتوى المنصة آلياً               ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ── Check API key ─────────────────────────────────────────────────────────
if "%GEMINI_API_KEY%"=="" (
    echo  [!] تحذير: متغير GEMINI_API_KEY غير موجود في بيئة النظام.
    echo  [!] يمكنك إضافته الآن مؤقتاً:
    set /p GEMINI_API_KEY="     الصق مفتاح Gemini API هنا: "
    echo.
)

:: ── Start server ──────────────────────────────────────────────────────────
echo  [*] جاري تشغيل الخادم على: http://localhost:5005
echo  [*] اضغط Ctrl+C لإيقاف الخادم
echo.
python "%~dp0server.py"
pause
