/**
 * Paketleme Kalite Kontrol Formu - Google Apps Script Backend
 * 
 * KURULUM ADIMLARI:
 * 1. Google Sheets'te yeni bir elektronik tablo oluşturun
 * 2. İlk sayfayı "database" olarak adlandırın
 * 3. Uzantılar > Apps Script'e gidin
 * 4. Bu kodu yapıştırın
 * 5. Dağıt > Web uygulaması olarak dağıt
 * 6. "Erişimi olan herkes" olarak ayarlayın
 * 7. Web uygulaması URL'sini kopyalayıp app.js'deki SCRIPT_URL'ye yapıştırın
 */

// ========================================
// Configuration
// ========================================
const CONFIG = {
  DATABASE_SHEET_NAME: 'database',
  PERSONEL_SHEET_NAME: 'personel',
  MACHINES_SHEET_NAME: 'machines',
  DEFECT_SHEET_NAME: 'defect',
  EMAIL_RECIPIENTS: 'emre@kalisan.com.tr, aleyna@kalisan.com.tr, emel.ekinci@kalisan.com.tr, tugba.ucar@kalisan.com.tr, beste.akillilar@kalisan.com.tr', // Birden fazla alıcı için virgül ile ayırın: 'mail1@gmail.com, mail2@gmail.com'
  TIMEZONE: 'Europe/Istanbul'
};

// Database column headers
const HEADERS = [
  'Tarih',
  'Makine', 
  'PO',
  'SKU',
  'Lot',
  'Hata',
  'Hata Açıklama',
  'Hata Görsel',
  'Kefe',
  'Sayım',
  'Veri Giriş',
  'Sorumlu',
  'Kalite Kontrol',
  'Kayıt Zamanı'
];

// ========================================
// Web App Entry Points
// ========================================

/**
 * Handle GET requests (for fetching records)
 */
function doGet(e) {
  try {
    // Apps Script editöründen doğrudan çalıştırıldığında hata vermesini önlemek için e kontrolü eklendi
    if (!e || !e.parameter) {
      return createJsonResponse({ success: false, message: 'Bu fonksiyon doğrudan editörden çalıştırılamaz. Lütfen Web Uygulaması URL si üzerinden istek gönderin.' });
    }
    
    const action = e.parameter.action;
    const callback = e.parameter.callback; // JSONP callback
    
    let responseData;
    
    if (action === 'search') {
      const tarih = e.parameter.tarih || '';
      const makine = e.parameter.makine || '';
      const records = searchRecords(tarih, makine);
      responseData = { success: true, data: records };
    } else if (action === 'getPersonnel') {
      const personnel = getPersonnelList();
      responseData = { success: true, data: personnel };
    } else if (action === 'getMachines') {
      const machines = getMachineList();
      responseData = { success: true, data: machines };
    } else if (action === 'getDefects') {
      const defects = getDefectList();
      responseData = { success: true, data: defects };
    } else if (action === 'getLists') {
      // Tüm listeleri tek seferde getir (performans için)
      responseData = {
        success: true,
        data: {
          personnel: getPersonnelList(),
          machines: getMachineList(),
          defects: getDefectList()
        }
      };
    } else {
      responseData = { success: false, message: 'Geçersiz işlem' };
    }
    
    // JSONP callback varsa kullan
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(responseData) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return createJsonResponse(responseData);
  } catch (error) {
    const errorResponse = { success: false, message: error.toString() };
    const callback = (e && e.parameter) ? e.parameter.callback : null;
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errorResponse) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return createJsonResponse(errorResponse);
  }
}

/**
 * Handle POST requests (for submitting form data)
 */
function doPost(e) {
  // DEBUG: Gelen tüm verileri logla
  Logger.log('========== doPost CALLED ==========');
  Logger.log('e.parameter: ' + JSON.stringify(e.parameter));
  
  try {
    let action, formData;
    
    // Form verilerini al
    if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
      Logger.log('Action: ' + action);
      
      // Yöntem 1: Ayrı form alanları (yeni yöntem)
      if (e.parameter.tarih && e.parameter.makine) {
        formData = {
          tarih: e.parameter.tarih || '',
          makine: e.parameter.makine || '',
          po: e.parameter.po || '',
          sku: e.parameter.sku || '',
          lot: e.parameter.lot || '',
          hata: e.parameter.hata || '',
          hataAciklama: e.parameter.hataAciklama || '',
          hataGorsel: e.parameter.hataGorsel || '',
          kefe: e.parameter.kefe || '',
          sayim: e.parameter.sayim || '',
          veriGiris: e.parameter.veriGiris || '',
          sorumlu: e.parameter.sorumlu || '',
          kaliteKontrol: e.parameter.kaliteKontrol || '',
          isitma: e.parameter.isitma || '' // Yeni alan
        };
        Logger.log('Form data from separate fields');
      }
      // Yöntem 2: JSON data field (eski yöntem)
      else if (e.parameter.data) {
        formData = JSON.parse(e.parameter.data);
        Logger.log('Form data from JSON');
      }
      
      if (formData) {
        Logger.log('formData: ' + JSON.stringify(formData));
      }
    } 
    // Yöntem 3: Raw JSON body
    else if (e.postData && e.postData.contents) {
      Logger.log('Data from postData.contents');
      const jsonData = JSON.parse(e.postData.contents);
      action = jsonData.action;
      formData = jsonData.data;
    }
    
    if (action === 'submit' && formData) {
      Logger.log('Calling submitFormData...');
      const result = submitFormData(formData);
      Logger.log('Result: ' + JSON.stringify(result));
      return createJsonResponse(result);
    } else if (action === 'getLists' || action === 'search' || action === 'getPersonnel' || action === 'getMachines' || action === 'getDefects') {
      // app.js'in "fetch" kullanması durumunda POST ile gönderilen listeleme veya arama isteklerini doğrudan doGet e yönlendirir
      return doGet(e);
    }
    
    Logger.log('No valid action or formData found');
    return createJsonResponse({ success: false, message: 'Geçersiz işlem veya eksik veri' });
  } catch (error) {
    Logger.log('doPost Error: ' + error.toString());
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

// ========================================
// Core Functions
// ========================================

/**
 * Submit form data to database and send email
 */
function submitFormData(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dbSheet = ss.getSheetByName(CONFIG.DATABASE_SHEET_NAME);
    
    // Create database sheet if it doesn't exist
    if (!dbSheet) {
      dbSheet = ss.insertSheet(CONFIG.DATABASE_SHEET_NAME);
      dbSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      dbSheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }
    
    // Handle image FIRST - save to Drive and get URL
    let imageUrl = '';
    let imageFile = null;
    if (formData.hataGorsel && formData.hataGorsel.startsWith('data:image')) {
      imageFile = saveImageToDrive(formData.hataGorsel, formData.po, formData.sku);
      if (imageFile) {
        imageUrl = imageFile.getUrl(); // Drive linki
      }
    }
    
    // Prepare row data - görsel yerine Drive linki yazıyoruz
    const now = new Date();
    const rowData = [
      formData.tarih || '',
      formData.makine || '',
      formData.po || '',
      formData.sku || '',
      formData.lot || '',
      formData.hata || '',
      formData.hataAciklama || '',
      imageUrl, // Base64 yerine Drive linki
      formData.kefe || '',
      formData.sayim || '',
      formData.veriGiris || '',
      formData.sorumlu || '',
      formData.kaliteKontrol || '',
      Utilities.formatDate(now, CONFIG.TIMEZONE, 'dd.MM.yyyy HH:mm:ss')
    ];
    
    // Append to database
    const lastRow = dbSheet.getLastRow() + 1;
    dbSheet.getRange(lastRow, 1, 1, rowData.length).setValues([rowData]);
    
    // Send email notification
    sendEmailNotification(formData, imageFile);
    
    return { success: true, message: 'Kayıt başarıyla eklendi' };
  } catch (error) {
    Logger.log('submitFormData Error: ' + error.toString());
    throw error;
  }
}

/**
 * Search records by date and/or machine
 */
function searchRecords(tarih, makine) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName(CONFIG.DATABASE_SHEET_NAME);
  
  if (!dbSheet || dbSheet.getLastRow() < 2) {
    return [];
  }
  
  const dataRange = dbSheet.getRange(2, 1, dbSheet.getLastRow() - 1, HEADERS.length);
  const data = dataRange.getValues();
  
  const results = [];
  
  data.forEach(row => {
    let rowDate = row[0];
    
    // Convert date to string format if it's a Date object
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, CONFIG.TIMEZONE, 'dd.MM.yyyy');
    }
    
    const rowMachine = row[1];
    
    // Filter logic
    let matchDate = !tarih || rowDate === tarih;
    let matchMachine = !makine || rowMachine === makine;
    
    if (matchDate && matchMachine) {
      results.push({
        tarih: rowDate,
        makine: rowMachine,
        po: row[2],
        sku: row[3],
        lot: row[4],
        hata: row[5],
        hataAciklama: row[6],
        hataGorsel: row[7],
        kefe: row[8],
        sayim: row[9],
        veriGiris: row[10],
        sorumlu: row[11],
        kaliteKontrol: row[12]
      });
    }
  });
  
  return results;
}

/**
 * Get personnel list from sheet
 */
function getPersonnelList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.PERSONEL_SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() < 1) {
    Logger.log('Personel sayfası bulunamadı veya boş');
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  // İlk satır başlık olabilir, 2. satırdan başla
  const startRow = 2;
  if (lastRow < startRow) return [];
  
  const data = sheet.getRange(startRow, 1, lastRow - 1, 1).getValues();
  return data.flat().filter(name => name && name.toString().trim() !== '');
}

/**
 * Get machine list from sheet
 */
function getMachineList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.MACHINES_SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() < 1) {
    Logger.log('Machines sayfası bulunamadı veya boş');
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  const startRow = 2; // İlk satır başlık
  if (lastRow < startRow) return [];
  
  const data = sheet.getRange(startRow, 1, lastRow - 1, 1).getValues();
  return data.flat().filter(name => name && name.toString().trim() !== '');
}

/**
 * Get defect/error type list from sheet
 */
function getDefectList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DEFECT_SHEET_NAME);
  
  if (!sheet || sheet.getLastRow() < 1) {
    Logger.log('Defect sayfası bulunamadı veya boş');
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  const startRow = 2; // İlk satır başlık
  if (lastRow < startRow) return [];
  
  const data = sheet.getRange(startRow, 1, lastRow - 1, 1).getValues();
  return data.flat().filter(name => name && name.toString().trim() !== '');
}

// ========================================
// Helper Functions
// ========================================

/**
 * Save base64 image to Google Drive
 */
function saveImageToDrive(base64Data, po, sku) {
  try {
    // Extract the base64 content
    const parts = base64Data.split(',');
    const mimeType = parts[0].match(/:(.*?);/)[1];
    const base64 = parts[1];
    
    // Determine file extension
    const ext = mimeType.split('/')[1] || 'png';
    
    // Create blob from base64
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64),
      mimeType,
      `Hata_Gorsel_${po}_${sku}_${Date.now()}.${ext}`
    );
    
    // Save to Drive (in root folder or create a dedicated folder)
    let folder;
    const folders = DriveApp.getFoldersByName('Kalite Kontrol Görselleri');
    
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder('Kalite Kontrol Görselleri');
    }
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file;
  } catch (error) {
    console.error('Image save error:', error);
    return null;
  }
}

/**
 * Send email notification
 */
function sendEmailNotification(formData, imageFile) {
  const subject = `${formData.makine} | PO:${formData.po} | SKU: ${formData.sku} | Kontrol Raporu`;

  let htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 20px;"> Paketleme Kalite Kontrol Raporu</h1>
        <p style="margin: 5px 0 0; opacity: 0.9;">${formData.makine}</p>
      </div>

      <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#475569;width:120px;"> Tarih</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;">${formData.tarih}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#475569;width:120px;"> Makine</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;">${formData.makine}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#475569;width:120px;"> PO</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;">${formData.po}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#475569;width:120px;"> SKU</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;">${formData.sku}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#475569;width:120px;"> Lot Numarası</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;">${formData.lot || '-'}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#ef4444;width:120px;">⚠️ Hata</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#ef4444;font-weight:bold;">${formData.hata}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#475569;width:120px;"> Açıklama</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;">${formData.hataAciklama || '-'}</td></tr>
        </table>

            <!-- Standart Alanlar (Her zaman görünür) -->
            <tr><td style="padding:8px 0;color:#475569;font-weight:500;">Kefe:</td><td style="padding:8px 0;color:#1e293b;">${formData.kefe}</td></tr>
            <tr><td style="padding:8px 0;color:#475569;font-weight:500;">Sayım:</td><td style="padding:8px 0;color:#1e293b;">${formData.sayim}</td></tr>
            <tr><td style="padding:8px 0;color:#475569;font-weight:500;">Veri Giriş:</td><td style="padding:8px 0;color:#1e293b;">${formData.veriGiris}</td></tr>

            <!-- Isıtma Özel Alanı (Varsa görünür) -->
            ${(formData.isitma && (formData.hata && (formData.hata.toString().toLowerCase().includes('ısıtma') || formData.hata.toString().toLowerCase().includes('isitma')))) ? 
              `<tr><td style="padding:8px 0;color:#475569;font-weight:500;">Isıtma:</td><td style="padding:8px 0;color:#1e293b;">${formData.isitma}</td></tr>` 
              : ''
            }
            
            <!-- Diğer Standart Alanlar -->
            <tr><td style="padding:8px 0;color:#475569;font-weight:500;">Sorumlu:</td><td style="padding:8px 0;color:#1e293b;">${formData.sorumlu}</td></tr>
            <tr><td style="padding:8px 0;color:#475569;font-weight:500;">Kalite Kontrol:</td><td style="padding:8px 0;color:#1e293b;">${formData.kaliteKontrol}</td></tr>
          </table>
        </div>
      </div>

      <div style="background:#1e293b;color:#94a3b8;padding:15px;text-align:center;border-radius:0 0 10px 10px;font-size:12px;">
        Bu e-posta Kalite Kontrol Sistemi tarafından otomatik olarak gönderilmiştir.
      </div>
    </div>
  `;

  const options = {
    htmlBody: htmlBody,
    name: 'Paketleme Kalite Kontrol'
    // ❌ from satırını kaldırıyoruz. Alias yoksa teslimatı bozabilir.
    // from: 'packaging.qc.kalisan@gmail.com',
  };

  // Ek varsa
  if (imageFile) {
    try {
      options.attachments = [imageFile.getBlob()];
    } catch (attachError) {
      Logger.log('Attachment error: ' + attachError.toString());
      htmlBody += '<p><strong>Görsel Link:</strong> <a href="' + imageFile.getUrl() + '">Görseli Görüntüle</a></p>';
      options.htmlBody = htmlBody;
    }
  }

  // ✅ Alıcıları temizle + tek "to" string yap
   // Alıcıları listeye çevir
    // ✅ Alıcıları temizle + listeye çevir
  const recipients = CONFIG.EMAIL_RECIPIENTS
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  // ✅ BOŞ body verme (ÖNCE TANIMLA)
  const plainBody =
    `Paketleme Kalite Kontrol kaydı oluşturuldu.\n` +
    `Tarih: ${formData.tarih}\n` +
    `Makine: ${formData.makine}\n` +
    `PO: ${formData.po}\n` +
    `SKU: ${formData.sku}\n` +
    `Lot Numarası: ${formData.lot || '-'}\n` +
    `Hata: ${formData.hata}`;

  // Kaba Kuvvet Yöntemi: Herkese TEK TEK ayrı mail at
  recipients.forEach(recipient => {
    try {
      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        body: plainBody, // Artık hata vermez
        htmlBody: options.htmlBody,
        attachments: options.attachments || [],
        name: options.name
      });
      Logger.log('SUCCESS: Email sent to ' + recipient);
    } catch (e) {
      Logger.log('ERROR: Could not send to ' + recipient + '. Error: ' + e.toString());
    }
  });

  Logger.log('Mail işlemi tamamlandı.');

}
/**
 * Create JSON response for web app
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================
// Setup Functions (Run once)
// ========================================

/**
 * Initialize database sheet with headers
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dbSheet = ss.getSheetByName(CONFIG.DATABASE_SHEET_NAME);
  
  if (!dbSheet) {
    dbSheet = ss.insertSheet(CONFIG.DATABASE_SHEET_NAME);
  }
  
  // Set headers
  dbSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  dbSheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  dbSheet.getRange(1, 1, 1, HEADERS.length).setBackground('#1e40af');
  dbSheet.getRange(1, 1, 1, HEADERS.length).setFontColor('#ffffff');
  
  // Freeze header row
  dbSheet.setFrozenRows(1);
  
  // Auto-resize columns
  for (let i = 1; i <= HEADERS.length; i++) {
    dbSheet.autoResizeColumn(i);
  }
  
  SpreadsheetApp.getUi().alert('Database sayfası başarıyla oluşturuldu!');
}

/**
 * Create personnel sheet
 */
function setupPersonnelSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.PERSONEL_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PERSONEL_SHEET_NAME);
  }
  
  // Add header and sample data
  const sampleData = [
    ['Personel Adı'],
    ['İlknur Eğercioğlu'],
    ['Kadriye Pınar'],
    ['Sevinç Türkoğlu'],
    ['Derya Korkmaz'],
    ['Aylin Mutlu']
  ];
  
  sheet.getRange(1, 1, sampleData.length, 1).setValues(sampleData);
  sheet.getRange(1, 1).setFontWeight('bold');
  sheet.getRange(1, 1).setBackground('#818cf8');
  sheet.getRange(1, 1).setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumn(1);
  
  SpreadsheetApp.getUi().alert('✅ Personel sayfası oluşturuldu!\\n\\nBuraya personel isimlerini ekleyebilirsiniz.');
}

/**
 * Create machines sheet
 */
function setupMachinesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.MACHINES_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.MACHINES_SHEET_NAME);
  }
  
  // Add header and sample data
  const sampleData = [
    ['Makine Adı'],
    ['Makine 1'],
    ['Makine 2'],
    ['Makine 3'],
    ['Makine 4'],
    ['Makine 5'],
    ['Elle Paketleme 1'],
    ['Elle Paketleme 2'],
    ['Elle Paketleme 3'],
    ['Tüm Makineler']
  ];
  
  sheet.getRange(1, 1, sampleData.length, 1).setValues(sampleData);
  sheet.getRange(1, 1).setFontWeight('bold');
  sheet.getRange(1, 1).setBackground('#10b981');
  sheet.getRange(1, 1).setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumn(1);
  
  SpreadsheetApp.getUi().alert('✅ Machines sayfası oluşturuldu!\\n\\nBuraya makine isimlerini ekleyebilirsiniz.');
}

/**
 * Create defect/error types sheet
 */
function setupDefectSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.DEFECT_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.DEFECT_SHEET_NAME);
  }
  
  // Add header and sample data
  const sampleData = [
    ['Hata Türü'],
    ['Kolinin Baskısı'],
    ['Kolinin Sağlamlığı'],
    ['Koli Etiketi'],
    ['Paketin Yatay ve Dikey Dikişlerinin Sağlamlığı'],
    ['Paketin Ön Yüz Etiketi'],
    ['Paketin Arka Yüz Etiketi'],
    ['Paketin İçindeki Ürünün Rengi'],
    ['Yanlış Ambalaja Paketleme'],
    ['Ambalajın Baskısı ve Uyarı İbareleri'],
    ['Meksika Şapkası'],
    ['Hava Delikleri'],
    ['Yabancı Cisime Rastlama'],
    ['Nem Alıcı'],
    ['Birleşim Kolisi'],
    ['Etiket Değişimi'],
    ['Koli İçi Adet'],
    ['Paket İçi Adet']
  ];
  
  sheet.getRange(1, 1, sampleData.length, 1).setValues(sampleData);
  sheet.getRange(1, 1).setFontWeight('bold');
  sheet.getRange(1, 1).setBackground('#ef4444');
  sheet.getRange(1, 1).setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumn(1);
  
  SpreadsheetApp.getUi().alert('✅ Defect sayfası oluşturuldu!\\n\\nBuraya hata türlerini ekleyebilirsiniz.');
}

/**
 * Setup all sheets at once
 */
function setupAllSheets() {
  setupDatabase();
  setupPersonnelSheet();
  setupMachinesSheet();
  setupDefectSheet();
  SpreadsheetApp.getUi().alert('🎉 Tüm sayfalar başarıyla oluşturuldu!');
}

// ========================================
// Günlük "Hata Çıkmamıştır" Mail Kontrolü
// ========================================

/**
 * Her gün saat 17:55'te çalışır.
 * O gün database'de hiç hata kaydı yoksa
 * "Bugün hata çıkmamıştır" e-postası gönderir.
 */
function checkAndSendNoErrorEmail() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dbSheet = ss.getSheetByName(CONFIG.DATABASE_SHEET_NAME);
    
    // Bugünün tarihini al (Türkiye saati)
    const now = new Date();
    const todayStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'dd.MM.yyyy');
    
    let hasErrorToday = false;
    
    // Database'de bugüne ait kayıt var mı kontrol et
    if (dbSheet && dbSheet.getLastRow() >= 2) {
      const dataRange = dbSheet.getRange(2, 1, dbSheet.getLastRow() - 1, 1); // Sadece Tarih sütunu
      const dates = dataRange.getValues();
      
      for (let i = 0; i < dates.length; i++) {
        let rowDate = dates[i][0];
        
        // Date objesi ise string'e çevir
        if (rowDate instanceof Date) {
          rowDate = Utilities.formatDate(rowDate, CONFIG.TIMEZONE, 'dd.MM.yyyy');
        }
        
        if (rowDate === todayStr) {
          hasErrorToday = true;
          break;
        }
      }
    }
    
    // Bugün hiç hata kaydı yoksa mail gönder
    if (!hasErrorToday) {
      sendNoErrorEmail(todayStr);
      Logger.log('Bugün (' + todayStr + ') hata kaydı bulunamadı. "Hata çıkmamıştır" maili gönderildi.');
    } else {
      Logger.log('Bugün (' + todayStr + ') hata kaydı mevcut. Mail gönderilmedi.');
    }
  } catch (error) {
    Logger.log('checkAndSendNoErrorEmail Hatası: ' + error.toString());
  }
}

/**
 * "Bugün hata çıkmamıştır" e-postası gönderir
 */
function sendNoErrorEmail(todayStr) {
  const subject = `✅ ${todayStr} | Paketleme Kalite Kontrol - Hata Çıkmamıştır`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">✅ Paketleme Kalite Kontrol - Günlük Rapor</h1>
        <p style="margin: 5px 0 0; opacity: 0.9;">${todayStr}</p>
      </div>

      <div style="background: #f0fdf4; padding: 30px; border: 1px solid #bbf7d0; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
        <h2 style="color: #166534; margin: 0 0 10px;">Hata Çıkmamıştır</h2>
        <p style="color: #15803d; font-size: 16px; margin: 0;">
          Bugün (${todayStr}) paketleme kalite kontrol sürecinde herhangi bir hata kaydı oluşturulmamıştır.
        </p>
      </div>

      <div style="background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
        Bu e-posta Kalite Kontrol Sistemi tarafından otomatik olarak gönderilmiştir.
      </div>
    </div>
  `;
  
  const plainBody = `Paketleme Kalite Kontrol - Günlük Rapor\n\n` +
    `Tarih: ${todayStr}\n\n` +
    `Bugün paketleme kalite kontrol sürecinde herhangi bir hata kaydı oluşturulmamıştır.\n\n` +
    `Bu e-posta otomatik olarak gönderilmiştir.`;
  
  const recipients = CONFIG.EMAIL_RECIPIENTS
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);
  
  recipients.forEach(recipient => {
    try {
      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        body: plainBody,
        htmlBody: htmlBody,
        name: 'Paketleme Kalite Kontrol'
      });
      Logger.log('SUCCESS: "Hata çıkmamıştır" maili gönderildi: ' + recipient);
    } catch (e) {
      Logger.log('ERROR: Mail gönderilemedi: ' + recipient + '. Hata: ' + e.toString());
    }
  });
}

/**
 * Günlük 18:00 tetikleyicisini kurar.
 * Bu fonksiyonu Apps Script editöründen BİR KEZ çalıştırın.
 * Çalıştırdıktan sonra her gün saat 18:00'de otomatik olarak kontrol yapılacaktır.
 */
function setupDailyNoErrorTrigger() {
  // Önce mevcut tetikleyicileri temizle (çift tetikleyici olmasın)
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkAndSendNoErrorEmail') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('Mevcut tetikleyici silindi.');
    }
  });
  
  // Yeni tetikleyici oluştur - Her gün 18:00'de çalışsın
  ScriptApp.newTrigger('checkAndSendNoErrorEmail')
    .timeBased()
    .atHour(18)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone(CONFIG.TIMEZONE)
    .create();
  
  Logger.log('Günlük 18:00 tetikleyicisi başarıyla kuruldu!');
  
  try {
    SpreadsheetApp.getUi().alert(
      '✅ Günlük Kontrol Tetikleyicisi Kuruldu!\n\n' +
      'Her gün saat 18:00 civarında (Türkiye saati) kontrol yapılacak.\n' +
      'Eğer o gün hiç hata kaydı girilmemişse, "Hata Çıkmamıştır" maili gönderilecektir.\n\n' +
      'Alıcılar: ' + CONFIG.EMAIL_RECIPIENTS
    );
  } catch (uiError) {
    // Web uygulaması üzerinden çalıştırıldıysa UI kullanılamaz
    Logger.log('UI alert gösterilemedi (muhtemelen trigger üzerinden çalışıyor).');
  }
}

/**
 * Tetikleyiciyi kaldırır
 */
function removeDailyNoErrorTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkAndSendNoErrorEmail') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  
  Logger.log(removed + ' adet tetikleyici kaldırıldı.');
  
  try {
    SpreadsheetApp.getUi().alert('✅ Günlük kontrol tetikleyicisi kaldırıldı. (' + removed + ' adet)');
  } catch (uiError) {
    Logger.log('UI alert gösterilemedi.');
  }
}

// ========================================
// Haftalık Özet Mail Sistemi
// ========================================

/**
 * Cumartesi günü 16:15'te çalışır.
 * Pazartesi'den Cumartesi'ye kadar olan haftanın tüm kayıtlarını inceler
 * ve özet rapor e-postası gönderir.
 */
function sendWeeklySummaryEmail() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dbSheet = ss.getSheetByName(CONFIG.DATABASE_SHEET_NAME);
    
    const now = new Date();
    
    // Bu haftanın Pazartesi ve Cumartesi tarihlerini hesapla
    const today = new Date(now);
    const dayOfWeek = today.getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
    
    // Pazartesi'yi bul (Cumartesi'den 5 gün geri)
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    // Cumartesi (bugün)
    const saturday = new Date(today);
    saturday.setHours(23, 59, 59, 999);
    
    const mondayStr = Utilities.formatDate(monday, CONFIG.TIMEZONE, 'dd.MM.yyyy');
    const saturdayStr = Utilities.formatDate(saturday, CONFIG.TIMEZONE, 'dd.MM.yyyy');
    
    // Haftanın tüm gün tarihlerini oluştur (Pzt-Cmt)
    const weekDays = [];
    for (let d = 0; d < 6; d++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + d);
      weekDays.push(Utilities.formatDate(day, CONFIG.TIMEZONE, 'dd.MM.yyyy'));
    }
    
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    
    // Database'den bu haftanın kayıtlarını topla
    let weeklyRecords = [];
    
    if (dbSheet && dbSheet.getLastRow() >= 2) {
      const dataRange = dbSheet.getRange(2, 1, dbSheet.getLastRow() - 1, HEADERS.length);
      const allData = dataRange.getValues();
      
      allData.forEach(row => {
        let rowDate = row[0];
        if (rowDate instanceof Date) {
          rowDate = Utilities.formatDate(rowDate, CONFIG.TIMEZONE, 'dd.MM.yyyy');
        }
        
        if (weekDays.includes(rowDate)) {
          weeklyRecords.push({
            tarih: rowDate,
            makine: row[1] || '-',
            po: row[2] || '-',
            sku: row[3] || '-',
            lot: row[4] || '-',
            hata: row[5] || '-',
            hataAciklama: row[6] || '-'
          });
        }
      });
    }
    
    // İstatistikleri hesapla
    const totalErrors = weeklyRecords.length;
    
    // Gün bazlı dağılım
    const dayDistribution = {};
    weekDays.forEach((day, i) => {
      dayDistribution[day] = { name: dayNames[i], count: 0 };
    });
    weeklyRecords.forEach(r => {
      if (dayDistribution[r.tarih]) {
        dayDistribution[r.tarih].count++;
      }
    });
    
    // Hatasız günler
    const noErrorDays = weekDays.filter(day => dayDistribution[day].count === 0);
    
    // Makine bazlı dağılım
    const machineDistribution = {};
    weeklyRecords.forEach(r => {
      machineDistribution[r.makine] = (machineDistribution[r.makine] || 0) + 1;
    });
    
    // Hata türü bazlı dağılım
    const defectDistribution = {};
    weeklyRecords.forEach(r => {
      defectDistribution[r.hata] = (defectDistribution[r.hata] || 0) + 1;
    });
    
    // En çok hata veren makine
    let topMachine = '-';
    let topMachineCount = 0;
    Object.keys(machineDistribution).forEach(m => {
      if (machineDistribution[m] > topMachineCount) {
        topMachine = m;
        topMachineCount = machineDistribution[m];
      }
    });
    
    // En sık hata türü
    let topDefect = '-';
    let topDefectCount = 0;
    Object.keys(defectDistribution).forEach(d => {
      if (defectDistribution[d] > topDefectCount) {
        topDefect = d;
        topDefectCount = defectDistribution[d];
      }
    });
    
    // HTML mail oluştur
    const subject = `📊 Haftalık Özet | ${mondayStr} - ${saturdayStr} | Paketleme Kalite Kontrol`;
    
    // Gün bazlı tablo satırları
    let dayRowsHtml = '';
    weekDays.forEach(day => {
      const info = dayDistribution[day];
      const barWidth = totalErrors > 0 ? Math.round((info.count / totalErrors) * 100) : 0;
      const bgColor = info.count === 0 ? '#f0fdf4' : '#fff';
      const countColor = info.count === 0 ? '#16a34a' : '#dc2626';
      const countText = info.count === 0 ? '✅ Hata Yok' : info.count + ' hata';
      dayRowsHtml += `
        <tr style="background:${bgColor};">
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:500;color:#334155;">${info.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">${day}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="background:#e2e8f0;border-radius:4px;height:8px;width:100px;overflow:hidden;">
                <div style="background:${info.count === 0 ? '#22c55e' : '#ef4444'};height:100%;width:${barWidth}%;border-radius:4px;"></div>
              </div>
              <span style="color:${countColor};font-weight:600;font-size:13px;">${countText}</span>
            </div>
          </td>
        </tr>`;
    });
    
    // Makine bazlı tablo satırları
    let machineRowsHtml = '';
    const sortedMachines = Object.entries(machineDistribution).sort((a, b) => b[1] - a[1]);
    sortedMachines.forEach(([machine, count]) => {
      const pct = totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0;
      machineRowsHtml += `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${machine}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-weight:600;text-align:center;">${count}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;text-align:center;">%${pct}</td>
        </tr>`;
    });
    
    // Hata türü bazlı tablo satırları
    let defectRowsHtml = '';
    const sortedDefects = Object.entries(defectDistribution).sort((a, b) => b[1] - a[1]);
    sortedDefects.forEach(([defect, count]) => {
      const pct = totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0;
      defectRowsHtml += `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${defect}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-weight:600;text-align:center;">${count}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;text-align:center;">%${pct}</td>
        </tr>`;
    });
    
    // Detay listesi (son 20 kayıt)
    let detailRowsHtml = '';
    const recentRecords = weeklyRecords.slice(-20);
    recentRecords.forEach(r => {
      detailRowsHtml += `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;">${r.tarih}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;">${r.makine}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;">${r.po}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px;">${r.sku}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-size:12px;">${r.hata}</td>
        </tr>`;
    });
    
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <!-- Başlık -->
      <div style="background: linear-gradient(135deg, #6366f1, #4338ca); color: white; padding: 24px; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">📊 Haftalık Kalite Kontrol Özet Raporu</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">${mondayStr} — ${saturdayStr}</p>
      </div>

      <!-- Özet Kartları -->
      <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px;text-align:center;width:25%;">
              <div style="background:white;border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size:28px;font-weight:700;color:${totalErrors === 0 ? '#16a34a' : '#dc2626'};">${totalErrors}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">Toplam Hata</div>
              </div>
            </td>
            <td style="padding:10px;text-align:center;width:25%;">
              <div style="background:white;border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size:28px;font-weight:700;color:#16a34a;">${noErrorDays.length}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">Hatasız Gün</div>
              </div>
            </td>
            <td style="padding:10px;text-align:center;width:25%;">
              <div style="background:white;border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size:16px;font-weight:700;color:#ea580c;">${topMachine}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">En Çok Hata (${topMachineCount})</div>
              </div>
            </td>
            <td style="padding:10px;text-align:center;width:25%;">
              <div style="background:white;border-radius:10px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size:14px;font-weight:700;color:#7c3aed;">${topDefect}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">En Sık Hata (${topDefectCount})</div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Gün Bazlı Dağılım -->
      <div style="background:white;padding:20px;border:1px solid #e2e8f0;border-top:none;">
        <h3 style="margin:0 0 12px;color:#1e293b;font-size:16px;">📅 Gün Bazlı Dağılım</h3>
        <table style="width:100%;border-collapse:collapse;">
          ${dayRowsHtml}
        </table>
      </div>

      <!-- Makine Bazlı Dağılım -->
      ${totalErrors > 0 ? `
      <div style="background:white;padding:20px;border:1px solid #e2e8f0;border-top:none;">
        <h3 style="margin:0 0 12px;color:#1e293b;font-size:16px;">🔧 Makine Bazlı Dağılım</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 12px;text-align:left;color:#475569;font-size:13px;">Makine</th>
            <th style="padding:8px 12px;text-align:center;color:#475569;font-size:13px;">Hata Sayısı</th>
            <th style="padding:8px 12px;text-align:center;color:#475569;font-size:13px;">Oran</th>
          </tr>
          ${machineRowsHtml}
        </table>
      </div>
      ` : ''}

      <!-- Hata Türü Dağılımı -->
      ${totalErrors > 0 ? `
      <div style="background:white;padding:20px;border:1px solid #e2e8f0;border-top:none;">
        <h3 style="margin:0 0 12px;color:#1e293b;font-size:16px;">⚠️ Hata Türü Dağılımı</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 12px;text-align:left;color:#475569;font-size:13px;">Hata Türü</th>
            <th style="padding:8px 12px;text-align:center;color:#475569;font-size:13px;">Sayı</th>
            <th style="padding:8px 12px;text-align:center;color:#475569;font-size:13px;">Oran</th>
          </tr>
          ${defectRowsHtml}
        </table>
      </div>
      ` : ''}

      <!-- Detay Listesi -->
      ${totalErrors > 0 ? `
      <div style="background:white;padding:20px;border:1px solid #e2e8f0;border-top:none;">
        <h3 style="margin:0 0 12px;color:#1e293b;font-size:16px;">📋 Kayıt Detayları${totalErrors > 20 ? ' (Son 20)' : ''}</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="background:#f1f5f9;">
            <th style="padding:6px 10px;text-align:left;color:#475569;font-size:12px;">Tarih</th>
            <th style="padding:6px 10px;text-align:left;color:#475569;font-size:12px;">Makine</th>
            <th style="padding:6px 10px;text-align:left;color:#475569;font-size:12px;">PO</th>
            <th style="padding:6px 10px;text-align:left;color:#475569;font-size:12px;">SKU</th>
            <th style="padding:6px 10px;text-align:left;color:#475569;font-size:12px;">Hata</th>
          </tr>
          ${detailRowsHtml}
        </table>
      </div>
      ` : `
      <div style="background:#f0fdf4;padding:30px;border:1px solid #bbf7d0;border-top:none;text-align:center;">
        <div style="font-size:48px;margin-bottom:10px;">🎉</div>
        <h2 style="color:#166534;margin:0 0 8px;">Bu Hafta Hiç Hata Kaydı Yok!</h2>
        <p style="color:#15803d;margin:0;">Tebrikler! Bu hafta paketleme kalite kontrol sürecinde herhangi bir hata tespit edilmemiştir.</p>
      </div>
      `}

      <!-- Footer -->
      <div style="background:#1e293b;color:#94a3b8;padding:15px;text-align:center;border-radius:0 0 10px 10px;font-size:12px;">
        Bu e-posta Kalite Kontrol Sistemi tarafından otomatik olarak gönderilmiştir.
      </div>
    </div>
    `;
    
    // Plain text versiyon
    let plainBody = `Haftalık Kalite Kontrol Özet Raporu\n` +
      `Dönem: ${mondayStr} - ${saturdayStr}\n\n` +
      `Toplam Hata: ${totalErrors}\n` +
      `Hatasız Gün: ${noErrorDays.length}\n`;
    
    if (totalErrors > 0) {
      plainBody += `En Çok Hata Veren Makine: ${topMachine} (${topMachineCount})\n`;
      plainBody += `En Sık Hata Türü: ${topDefect} (${topDefectCount})\n\n`;
      
      plainBody += `Gün Bazlı:\n`;
      weekDays.forEach(day => {
        const info = dayDistribution[day];
        plainBody += `  ${info.name} (${day}): ${info.count === 0 ? 'Hata Yok ✅' : info.count + ' hata'}\n`;
      });
    } else {
      plainBody += `\nBu hafta hiç hata kaydı oluşturulmamıştır. Tebrikler!\n`;
    }
    
    // Mail gönder
    const recipients = CONFIG.EMAIL_RECIPIENTS
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);
    
    recipients.forEach(recipient => {
      try {
        MailApp.sendEmail({
          to: recipient,
          subject: subject,
          body: plainBody,
          htmlBody: htmlBody,
          name: 'Paketleme Kalite Kontrol'
        });
        Logger.log('SUCCESS: Haftalık özet maili gönderildi: ' + recipient);
      } catch (e) {
        Logger.log('ERROR: Haftalık özet gönderilemedi: ' + recipient + '. Hata: ' + e.toString());
      }
    });
    
    Logger.log('Haftalık özet mail işlemi tamamlandı. Toplam hata: ' + totalErrors);
  } catch (error) {
    Logger.log('sendWeeklySummaryEmail Hatası: ' + error.toString());
  }
}

/**
 * Haftalık özet tetikleyicisini kurar.
 * Her Cumartesi saat 16:15'te çalışır.
 * Bu fonksiyonu Apps Script editöründen BİR KEZ çalıştırın.
 */
function setupWeeklySummaryTrigger() {
  // Mevcut haftalık tetikleyicileri temizle
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendWeeklySummaryEmail') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('Mevcut haftalık tetikleyici silindi.');
    }
  });
  
  // Yeni tetikleyici: Her Cumartesi 16:15
  ScriptApp.newTrigger('sendWeeklySummaryEmail')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SATURDAY)
    .atHour(16)
    .nearMinute(15)
    .inTimezone(CONFIG.TIMEZONE)
    .create();
  
  Logger.log('Haftalık özet tetikleyicisi kuruldu! (Cumartesi 16:15)');
  
  try {
    SpreadsheetApp.getUi().alert(
      '✅ Haftalık Özet Tetikleyicisi Kuruldu!\n\n' +
      'Her Cumartesi saat 16:15 civarında (Türkiye saati) haftalık özet raporu gönderilecektir.\n\n' +
      'Rapor içeriği:\n' +
      '• Toplam hata sayısı\n' +
      '• Gün bazlı dağılım\n' +
      '• Makine bazlı dağılım\n' +
      '• Hata türü dağılımı\n' +
      '• Hatasız günler\n' +
      '• Kayıt detayları\n\n' +
      'Alıcılar: ' + CONFIG.EMAIL_RECIPIENTS
    );
  } catch (uiError) {
    Logger.log('UI alert gösterilemedi.');
  }
}

/**
 * Haftalık tetikleyiciyi kaldırır
 */
function removeWeeklySummaryTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendWeeklySummaryEmail') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  
  Logger.log(removed + ' adet haftalık tetikleyici kaldırıldı.');
  
  try {
    SpreadsheetApp.getUi().alert('✅ Haftalık özet tetikleyicisi kaldırıldı. (' + removed + ' adet)');
  } catch (uiError) {
    Logger.log('UI alert gösterilemedi.');
  }
}

/**
 * Add custom menu to spreadsheet
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ Kalite Kontrol')
    .addItem('🚀 Tüm Sayfaları Oluştur', 'setupAllSheets')
    .addSeparator()
    .addItem('📊 Database Oluştur', 'setupDatabase')
    .addItem('👥 Personel Sayfası Oluştur', 'setupPersonnelSheet')
    .addItem('🔧 Machines Sayfası Oluştur', 'setupMachinesSheet')
    .addItem('⚠️ Defect Sayfası Oluştur', 'setupDefectSheet')
    .addSeparator()
    .addItem('🧪 Test Kayıt Ekle', 'testSubmitData')
    .addSeparator()
    .addItem('⏰ Günlük Hata Kontrol Tetikleyicisi Kur', 'setupDailyNoErrorTrigger')
    .addItem('🗑️ Günlük Tetikleyiciyi Kaldır', 'removeDailyNoErrorTrigger')
    .addItem('🔍 Hata Kontrol Testi (Manuel)', 'checkAndSendNoErrorEmail')
    .addSeparator()
    .addItem('📊 Haftalık Özet Tetikleyicisi Kur', 'setupWeeklySummaryTrigger')
    .addItem('🗑️ Haftalık Tetikleyiciyi Kaldır', 'removeWeeklySummaryTrigger')
    .addItem('📊 Haftalık Özet Testi (Manuel)', 'sendWeeklySummaryEmail')
    .addToUi();
}

/**
 * TEST FUNCTION - Apps Script editöründen çalıştırarak test edin
 * Çalıştırmak için: Fonksiyonlar > testSubmitData seçin ve çalıştırın
 */
function testSubmitData() {
  const testData = {
    tarih: '30.12.2024',
    makine: 'Makine 1',
    po: 'TEST-PO-001',
    sku: 'TEST-SKU-001',
    lot: 'TEST-LOT-001',
    hata: 'Test Hatası',
    hataAciklama: 'Bu bir test kaydıdır',
    hataGorsel: '',
    kefe: 'Test Kişi 1',
    sayim: 'Test Kişi 2',
    veriGiris: 'Test Kişi 3',
    sorumlu: 'Test Kişi 4',
    kaliteKontrol: 'Test Kişi 5'
  };
  
  try {
    const result = submitFormData(testData);
    Logger.log('Test Sonucu: ' + JSON.stringify(result));
    SpreadsheetApp.getUi().alert('✅ Test başarılı!\n\nDatabase sayfasını kontrol edin.\nE-posta gönderildi.');
  } catch (error) {
    Logger.log('Test Hatası: ' + error.toString());
    SpreadsheetApp.getUi().alert('❌ Test başarısız!\n\nHata: ' + error.toString());
  }
}

/**
 * DEBUG: doPost'un aldığı verileri logla
 */
function testDoPost() {
  // Simüle edilmiş POST verisi
  const mockEvent = {
    parameter: {
      action: 'submit',
      data: JSON.stringify({
        tarih: '30.12.2024',
        makine: 'Makine 2',
        po: 'MOCK-PO-002',
        sku: 'MOCK-SKU-002',
        lot: 'MOCK-LOT-002',
        hata: 'Mock Hata',
        hataAciklama: 'Mock test',
        hataGorsel: '',
        kefe: 'Kefe Test',
        sayim: 'Sayım Test',
        veriGiris: 'Veri Test',
        sorumlu: 'Sorumlu Test',
        kaliteKontrol: 'KK Test'
      })
    }
  };
  
  Logger.log('Mock Event: ' + JSON.stringify(mockEvent));
  
  try {
    const response = doPost(mockEvent);
    Logger.log('Response: ' + response.getContent());
    SpreadsheetApp.getUi().alert('✅ doPost testi başarılı!\n\nLogs\'u kontrol edin.');
  } catch (error) {
    Logger.log('doPost Hatası: ' + error.toString());
    SpreadsheetApp.getUi().alert('❌ doPost testi başarısız!\n\nHata: ' + error.toString());
  }
}

