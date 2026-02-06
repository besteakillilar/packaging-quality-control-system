/**
 * Handle GET requests (for fetching records)
 * FIXED VERSION - with null/undefined checks
 */
function doGet(e) {
  try {
    // ✅ NULL CHECK - e veya e.parameter undefined olabilir
    if (!e || !e.parameter) {
      Logger.log('ERROR: e or e.parameter is undefined');
      const errorResponse = { 
        success: false, 
        message: 'Invalid request: missing parameters. Check deployment settings - "Who has access" must be "Anyone"' 
      };
      return ContentService
        .createTextOutput(JSON.stringify(errorResponse))
        .setMimeType(ContentService.MimeType.JSON);
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
    Logger.log('doGet Error: ' + error.toString());
    const errorResponse = { success: false, message: error.toString() };
    
    // ✅ NULL CHECK - e.parameter undefined olabilir
    const callback = (e && e.parameter) ? e.parameter.callback : null;
    
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errorResponse) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return createJsonResponse(errorResponse);
  }
}
