@echo off
echo ========================================
echo Google Sheets 400 Hatasi - Hizli Cozum
echo ========================================
echo.
echo Bu script tarayicinizi temizleyecek ve test sayfasini acacak.
echo.
pause

echo.
echo [1/3] Test sayfasi aciliyor...
start test-connection.html

echo.
echo [2/3] Ana uygulama aciliyor...
timeout /t 2 >nul
start index.html

echo.
echo [3/3] Deployment rehberi aciliyor...
timeout /t 2 >nul
start DEPLOYMENT_GUIDE.md

echo.
echo ========================================
echo YAPILACAKLAR:
echo ========================================
echo.
echo 1. Test sayfasinda "Baglanti Test Et" butonuna tiklayin
echo    - Basarili ise: Sorun cozuldu!
echo    - Basarisiz ise: Asagidaki adimlari izleyin
echo.
echo 2. Google Sheets'i acin
echo    - Uzantilar ^> Apps Script
echo    - Deploy ^> Manage deployments
echo    - Kalem ikonuna tiklayin
echo    - "New version" secin
echo    - Deploy edin
echo.
echo 3. Tarayicida CTRL+SHIFT+DELETE ile cache'i temizleyin
echo    - "Cached images and files" secin
echo    - "Clear data" tiklayin
echo.
echo 4. Sayfayi yenileyin (CTRL+F5)
echo.
echo ========================================
echo.
pause
