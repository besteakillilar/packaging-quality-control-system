/**
 * Handle GET requests (for fetching records)
 * UPDATED: Supports both GET and POST methods for data retrieval
 */
function doGet(e) {
  try {
    // ✅ Support both GET and POST for data retrieval
    let params = {};
    
    if (e && e.parameter) {
      // GET request
      params = e.parameter;
    } else if (e && e.postData && e.postData.contents) {
      // POST request - parse form data
      const contents = e.postData.contents;
      const pairs = contents.split('&');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
    } else {
      Logger.log('ERROR: No parameters found');
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: false, 
          message: 'No parameters found' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const action = params.action;
    const callback = params.callback;
    
    Logger.log('doGet - Action: ' + action);
    
    let responseData;
    
    if (action === 'search') {
      const tarih = params.tarih || '';
      const makine = params.makine || '';
      const records = searchRecords(tarih, makine);
      responseData = { success: true, data: records };
    } else if (action === 'getLists') {
      responseData = {
        success: true,
        data: {
          personnel: getPersonnelList(),
          machines: getMachineList(),
          defects: getDefectList()
        }
      };
    } else {
      responseData = { success: false, message: 'Geçersiz işlem: ' + action };
    }
    
    // JSONP callback varsa kullan
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(responseData) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('doGet Error: ' + error.toString());
    const errorResponse = { success: false, message: error.toString() };
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests (for submitting form data AND data retrieval)
 */
function doPost(e) {
  Logger.log('========== doPost CALLED ==========');
  
  try {
    let params = {};
    let action = '';
    
    // Parse POST data
    if (e && e.parameter && e.parameter.action) {
      params = e.parameter;
      action = e.parameter.action;
      Logger.log('POST - Action from e.parameter: ' + action);
    } else if (e && e.postData && e.postData.contents) {
      const contents = e.postData.contents;
      Logger.log('POST - Raw contents: ' + contents);
      
      // Parse form data
      const pairs = contents.split('&');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
      action = params.action;
      Logger.log('POST - Action from postData: ' + action);
    }
    
    // ✅ Data retrieval actions (getLists, search) → use doGet logic
    if (action === 'getLists' || action === 'search') {
      Logger.log('Redirecting to doGet for data retrieval');
      return doGet(e);
    }
    
    // ✅ Form submission action
    if (action === 'submit') {
      Logger.log('Processing form submission');
      
      let formData;
      
      // Method 1: Separate form fields
      if (params.tarih && params.makine) {
        formData = {
          tarih: params.tarih || '',
          makine: params.makine || '',
          po: params.po || '',
          sku: params.sku || '',
          lot: params.lot || '',
          hata: params.hata || '',
          hataAciklama: params.hataAciklama || '',
          hataGorsel: params.hataGorsel || '',
          kefe: params.kefe || '',
          sayim: params.sayim || '',
          veriGiris: params.veriGiris || '',
          sorumlu: params.sorumlu || '',
          kaliteKontrol: params.kaliteKontrol || ''
        };
      }
      // Method 2: JSON data field
      else if (params.data) {
        formData = JSON.parse(params.data);
      }
      
      if (formData) {
        Logger.log('Calling submitFormData...');
        const result = submitFormData(formData);
        Logger.log('Result: ' + JSON.stringify(result));
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    Logger.log('No valid action or formData found');
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        message: 'Geçersiz işlem veya eksik veri' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('doPost Error: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        message: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
