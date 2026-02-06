# 🚨 ACIL ÇÖZÜM - Google Apps Script 400 Hatası

## Sorun: Sonsuz Redirect Loop
URL'nizde sonsuz redirect loop var. Bu, deployment'ın yanlış yapıldığını gösteriyor.

## ✅ KESIN ÇÖZÜM (5 Dakika)

### ADIM 1: Eski Deployment'ları Temizle

1. **Google Sheets'i açın**
2. **Uzantılar** > **Apps Script**
3. Sağ üstte **Deploy** > **Manage deployments**
4. **TÜM eski deployment'ları silin:**
   - Her deployment'ın yanındaki **🗑️ (çöp kutusu)** ikonuna tıklayın
   - "Archive" butonuna tıklayın
   - Tüm deployment'lar silinene kadar tekrarlayın

### ADIM 2: Yeni Deployment Yap (DOĞRU YÖNTEM)

1. **Deploy** > **New deployment** tıklayın

2. **"Select type"** yanındaki **⚙️ (dişli)** ikonuna tıklayın

3. **"Web app"** seçin

4. Ayarları **TAM OLARAK** şöyle yapın:
   ```
   Description: Production v1
   Execute as: Me (beste.akillilar@kalisan.com.tr)
   Who has access: Anyone
   ```
   
   ⚠️ **ÖNEMLİ:** "Who has access" mutlaka **"Anyone"** olmalı!

5. **Deploy** butonuna tıklayın

6. **"Authorize access"** ekranı gelecek:
   - Google hesabınızı seçin (beste.akillilar@kalisan.com.tr)
   - **"Advanced"** linkine tıklayın
   - **"Go to Untitled project (unsafe)"** tıklayın
   - **"Allow"** butonuna tıklayın

7. **Web app URL'sini kopyalayın**
   - Şuna benzer olmalı: `https://script.google.com/macros/s/AKfycby.../exec`
   - ⚠️ Sonunda `/exec` olmalı, `/dev` OLMAMALI!

### ADIM 3: URL'yi Güncelle

1. `app.js` dosyasını açın
2. 5. satırdaki URL'yi yeni URL ile değiştirin:

```javascript
const SCRIPT_URL = 'BURAYA_YENİ_URL_YAPIŞTIRIN';
```

3. Dosyayı kaydedin (Ctrl+S)

### ADIM 4: Test Et

1. Tarayıcıda **CTRL + SHIFT + DELETE** ile cache'i temizleyin
2. `test-connection.html` dosyasını açın
3. Yeni URL'yi yapıştırın
4. "Bağlantıyı Test Et" butonuna tıklayın

## 🎯 Başarı Kriterleri

✅ URL sonunda `/exec` var
✅ Test sayfası "Bağlantı Başarılı" diyor
✅ Personel, Makine, Hata listeleri yükleniyor
✅ 400 hatası YOK

## ❌ Hala Çalışmıyorsa

### Kontrol Listesi:

1. **Sayfa isimleri doğru mu?**
   - Google Sheets'te şu sayfalar olmalı:
     - `database`
     - `personel`
     - `machines`
     - `defect`

2. **Sayfalar boş mu?**
   - Apps Script editöründe menüden:
   - **⚙️ Kalite Kontrol** > **🚀 Tüm Sayfaları Oluştur**
   - (Eğer menü yoksa, `onOpen()` fonksiyonunu çalıştırın)

3. **Authorization doğru mu?**
   - Deploy sırasında "Allow" butonuna tıkladınız mı?
   - Doğru Google hesabını seçtiniz mi?

## 🔍 Debug

### Apps Script Loglarını Kontrol Edin:

1. Apps Script editöründe **"Executions"** sekmesine gidin
2. Son çalıştırmaları görün
3. Hata varsa buradan görebilirsiniz

### Test Fonksiyonu Çalıştırın:

1. Apps Script editöründe üstteki dropdown'dan `testSubmitData` seçin
2. ▶️ **Run** butonuna tıklayın
3. Logları kontrol edin (View > Logs veya Ctrl+Enter)

## 📞 Yardım

Eğer hala çalışmıyorsa, şu bilgileri paylaşın:

1. Test sayfasındaki hata mesajı
2. Apps Script Executions sekmesindeki loglar
3. Google Sheets'teki sayfa isimleri (screenshot)
4. Deployment ayarları (screenshot)

---

## ⚡ Hızlı Notlar

- **"Test deployments"** kullanmayın - sadece production deployment
- **URL her zaman `/exec` ile bitmeli**
- **"Who has access" = "Anyone"** olmalı
- **Cache temizlemeyi unutmayın**
