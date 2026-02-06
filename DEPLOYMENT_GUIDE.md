# Google Apps Script Deployment Rehberi

## 🚨 400 Bad Request Hatası Çözümü

400 hatası alıyorsanız, Google Apps Script'i **yeniden deploy** etmeniz gerekiyor.

## Adım Adım Deployment

### 1. Google Sheets'i Açın
- Projenizin bağlı olduğu Google Sheets dosyasını açın

### 2. Apps Script Editörünü Açın
- Menüden: **Uzantılar** > **Apps Script**

### 3. Kodu Kontrol Edin
- `Code.gs` dosyasındaki kodun güncel olduğundan emin olun
- Eğer kod değişmişse, güncel kodu yapıştırın

### 4. YENİ DEPLOYMENT YAPIN (ÖNEMLİ!)

#### Eski Yöntem (Önerilmez):
❌ "Deploy" > "Test deployments" kullanmayın - bu sadece test içindir

#### DOĞRU Yöntem:
✅ **Şu adımları izleyin:**

1. Sağ üstteki **"Deploy"** butonuna tıklayın
2. **"New deployment"** seçin
3. **"Select type"** yanındaki ⚙️ (dişli) ikonuna tıklayın
4. **"Web app"** seçin
5. Ayarları şu şekilde yapın:
   - **Description**: "Production v1" (veya versiyon numarası)
   - **Execute as**: **Me** (sizin hesabınız)
   - **Who has access**: **Anyone** (Herkes - önemli!)
   
6. **"Deploy"** butonuna tıklayın
7. **"Authorize access"** ekranı gelecek:
   - Google hesabınızı seçin
   - "Advanced" > "Go to [Project Name] (unsafe)" tıklayın
   - "Allow" butonuna tıklayın

8. **Web app URL'sini kopyalayın**
   - Örnek: `https://script.google.com/macros/s/AKfycby.../exec`
   - Bu URL'yi `app.js` dosyasındaki `SCRIPT_URL` değişkenine yapıştırın

### 5. Mevcut Deployment'ı Güncelleme

Eğer daha önce deploy ettiyseniz ve sadece kodu güncellediyseniz:

1. **"Deploy"** > **"Manage deployments"**
2. Mevcut deployment'ın yanındaki ✏️ (kalem) ikonuna tıklayın
3. **"Version"** dropdown'ından **"New version"** seçin
4. **"Deploy"** butonuna tıklayın
5. Yeni URL'yi kopyalayın (genellikle aynı kalır ama kontrol edin)

### 6. URL'yi Güncelleyin

`app.js` dosyasını açın ve 5. satırdaki URL'yi güncelleyin:

```javascript
const SCRIPT_URL = 'BURAYA_YENİ_URL_YAPIŞTIRIN';
```

### 7. Test Edin

1. Tarayıcıda sayfayı yenileyin (Ctrl+F5 veya Cmd+Shift+R)
2. Form doldurarak test edin
3. Console'da (F12) hata olup olmadığını kontrol edin

## ⚠️ Sık Karşılaşılan Sorunlar

### "Authorization required" hatası
- Apps Script'te yeniden authorize etmeniz gerekiyor
- Deploy sırasında "Allow" butonuna tıklamayı unutmayın

### "Access denied" hatası
- "Who has access" ayarını **"Anyone"** olarak değiştirin
- Yeniden deploy edin

### Hala 400 hatası alıyorum
1. Browser cache'i temizleyin (Ctrl+Shift+Delete)
2. Incognito/Private modda deneyin
3. Google Sheets'teki sayfaların adlarını kontrol edin:
   - `database`
   - `personel`
   - `machines`
   - `defect`

### CORS hatası
- Google Apps Script web app'i "Anyone" olarak deploy edilmelidir
- URL'nin sonunda `/exec` olmalı, `/dev` olmamalı

## 🔍 Debug İpuçları

### Apps Script Loglarını Kontrol Edin
1. Apps Script editöründe: **"Executions"** sekmesine gidin
2. Son çalıştırmaları görün
3. Hata mesajlarını okuyun

### Test Fonksiyonunu Çalıştırın
1. Apps Script editöründe `testSubmitData` fonksiyonunu seçin
2. ▶️ Run butonuna tıklayın
3. Logları kontrol edin

## ✅ Başarılı Deployment Kontrolü

Deployment başarılı olduysa:
- ✅ URL `https://script.google.com/macros/s/...` ile başlamalı
- ✅ URL sonunda `/exec` olmalı
- ✅ Tarayıcıda URL'yi açtığınızda JSON yanıt görmeli veya "Geçersiz işlem" mesajı almalısınız
- ✅ Console'da 400 hatası OLMAMALI

## 📞 Hala Sorun mu Var?

1. Google Sheets'teki sayfa isimlerini kontrol edin
2. Apps Script'teki `CONFIG` kısmındaki isimleri kontrol edin
3. Email adreslerinin doğru olduğundan emin olun
4. Tüm sayfaları `setupAllSheets()` fonksiyonuyla oluşturun
