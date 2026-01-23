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
    const callback = e.parameter.callback;
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
          hata: e.parameter.hata || '',
          hataAciklama: e.parameter.hataAciklama || '',
          hataGorsel: e.parameter.hataGorsel || '',
          kefe: e.parameter.kefe || '',
          sayim: e.parameter.sayim || '',
          veriGiris: e.parameter.veriGiris || '',
          sorumlu: e.parameter.sorumlu || '',
          kaliteKontrol: e.parameter.kaliteKontrol || ''
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
        hata: row[4],
        hataAciklama: row[5],
        hataGorsel: row[6],
        kefe: row[7],
        sayim: row[8],
        veriGiris: row[9],
        sorumlu: row[10],
        kaliteKontrol: row[11]
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
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#ef4444;width:120px;">⚠️ Hata</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#ef4444;font-weight:bold;">${formData.hata}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#475569;width:120px;"> Açıklama</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;">${formData.hataAciklama || '-'}</td></tr>
        </table>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <h3 style="color: #1e40af; margin: 0 0 15px;">Personel Bilgileri</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding:8px 0;color:#475569;font-weight:500;">Kefe:</td><td style="padding:8px 0;color:#1e293b;">${formData.kefe}</td></tr>
            <tr><td style="padding:8px 0;color:#475569;font-weight:500;">Sayım:</td><td style="padding:8px 0;color:#1e293b;">${formData.sayim}</td></tr>
            <tr><td style="padding:8px 0;color:#475569;font-weight:500;">Veri Giriş:</td><td style="padding:8px 0;color:#1e293b;">${formData.veriGiris}</td></tr>
            
            ${(formData.hata && formData.hata.toString().toLowerCase().includes('ısıtma')) ? 
            `<tr><td style="padding:8px 0;color:#475569;font-weight:500;">Isıtma:</td><td style="padding:8px 0;color:#1e293b;">Isıtma İşlemi</td></tr>` : ''
            }
            
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

