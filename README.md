# 📋 Paketleme Kalite Kontrol Formu

Modern, responsive HTML arayüzü ile Google Sheets entegreli kalite kontrol sistemi.

## 🌟 Özellikler

- ✅ **Veri Girişi Formu**: Tarih, makine, PO, SKU, hata türü, açıklama, görsel ve personel bilgileri
- ✅ **Görsel Yükleme**: Drag & drop ile hata görseli yükleme
- ✅ **Kayıt Sorgulama**: Tarih ve makine bazlı filtreleme
- ✅ **E-posta Bildirimi**: Kayıt sonrası otomatik e-posta gönderimi
- ✅ **Google Sheets Entegrasyonu**: Tüm veriler Google Sheets'te saklanır
- ✅ **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- ✅ **Modern Dark Theme**: Premium görünüm

## 📁 Dosya Yapısı

```
📂 Packaging Quality Control Form/
├── 📄 index.html      # Ana HTML dosyası
├── 📄 style.css       # CSS stilleri
├── 📄 app.js          # JavaScript uygulaması
├── 📄 Code.gs         # Google Apps Script backend
└── 📄 README.md       # Bu dosya
```

## 🚀 Kurulum Adımları

### 1. Google Sheets Hazırlığı

1. [Google Sheets](https://sheets.google.com)'e gidin
2. Yeni bir elektronik tablo oluşturun
3. Tabloya "Kalite Kontrol Formu" gibi bir isim verin

### 2. Google Apps Script Kurulumu

1. Google Sheets'te **Uzantılar > Apps Script** menüsüne tıklayın
2. Varsayılan `Code.gs` içeriğini silin
3. Bu projeden `Code.gs` dosyasının içeriğini kopyalayıp yapıştırın
4. **Kaydet** (Ctrl + S) butonuna tıklayın
5. `CONFIG` bölümündeki e-posta adreslerini güncelleyin:
   ```javascript
   EMAIL_RECIPIENTS: 'email1@example.com, email2@example.com'
   ```

### 3. Web Uygulaması Olarak Yayınlama

1. Apps Script'te **Dağıt > Yeni dağıtım** seçin
2. **Tür** olarak "Web uygulaması" seçin
3. Açıklama yazın (örn: "v1.0")
4. **Şu şekilde yürüt**: "Ben" olarak bırakın
5. **Erişimi olan kişiler**: "Herkes" seçin
6. **Dağıt** butonuna tıklayın
7. Gerekli izinleri verin
8. **Web uygulaması URL'sini** kopyalayın

### 4. HTML Uygulamasını Yapılandırma

1. `app.js` dosyasını açın
2. İlk satırdaki `SCRIPT_URL` değerini güncelleyin:
   ```javascript
   const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
3. İsteğe bağlı: `PERSONEL_LISTESI` dizisini kendi personelinizle güncelleyin

### 5. Database Oluşturma

1. Google Sheets'e geri dönün
2. Menüde **⚙️ Kalite Kontrol > 📊 Database Oluştur** tıklayın
3. İsteğe bağlı: **👥 Personel Sayfası Oluştur** tıklayın

## 🖥️ Kullanım

### HTML Arayüzünü Açma

1. `index.html` dosyasını tarayıcınızda açın
2. Veya bir web sunucusunda barındırın

### Yeni Kayıt Ekleme

1. **Veri Girişi** sekmesine gidin
2. Tüm alanları doldurun
3. İsteğe bağlı olarak hata görseli yükleyin
4. **Kaydet ve Gönder** butonuna tıklayın

### Kayıtları Sorgulama

1. **Kayıt Sorgula** sekmesine gidin
2. Tarih ve/veya makine seçin
3. **Ara** butonuna tıklayın

## 🔧 Özelleştirme

### Makine Listesini Değiştirme

`index.html` dosyasında makine seçeneklerini düzenleyin:
```html
<select id="makine" name="makine" required>
    <option value="">Seçiniz...</option>
    <option value="Makine A">Makine A</option>
    <option value="Makine B">Makine B</option>
</select>
```

### Hata Türlerini Değiştirme

`index.html` dosyasında hata seçeneklerini düzenleyin:
```html
<select id="hata" name="hata" required>
    <option value="">Seçiniz...</option>
    <option value="Yeni Hata Türü">Yeni Hata Türü</option>
</select>
```

### E-posta Alıcılarını Değiştirme

`Code.gs` dosyasında:
```javascript
EMAIL_RECIPIENTS: 'yeni@email.com, diger@email.com'
```

## ⚠️ Önemli Notlar

1. **CORS**: HTML dosyası yerel olarak açıldığında CORS sorunları yaşanabilir. Bir web sunucusu kullanmanız önerilir.

2. **İzinler**: Google Apps Script'i ilk kez çalıştırırken gerekli izinleri onaylamanız gerekir.

3. **Kota Limitleri**: Google Apps Script günlük e-posta limitine tabidir (ücretsiz hesaplarda 100/gün).

4. **Görsel Boyutu**: Yüklenen görseller 5MB'dan küçük olmalıdır.

## 🐛 Sorun Giderme

### "SCRIPT_URL tanımlanmamış" hatası
- `app.js` dosyasındaki SCRIPT_URL'yi güncelleyin

### E-postalar gönderilmiyor
- Apps Script'in e-posta izinlerini kontrol edin
- `CONFIG.EMAIL_RECIPIENTS` değerini kontrol edin

### Kayıtlar görünmüyor
- Google Sheets'te "database" sayfasının var olduğundan emin olun
- Apps Script'i yeniden dağıtın

## 📞 Destek

Herhangi bir sorun için lütfen benimle iletişime geçiniz.

---

**Versiyon:** 1.0  
**Son Güncelleme:** Ocak 2026
