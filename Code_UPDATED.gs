/**
 * Handle GET requests with CORS headers
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback;
    
    let responseData;
    
    if (action === 'search') {
      const tarih = e.parameter.tarih || '';
      const makine = e.parameter.makine || '';
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
      responseData = { success: false, message: 'Geçersiz işlem' };
    }
    
    // JSONP callback - CORS sorununu çözer
    if (callback) {
      const output = ContentService.createTextOutput(
        callback + '(' + JSON.stringify(responseData) + ')'
      );
      output.setMimeType(ContentService.MimeType.JAVASCRIPT);
      
      // CORS headers ekle
      return output;
    }
    
    // Normal JSON response
    const output = ContentService.createTextOutput(JSON.stringify(responseData));
    output.setMimeType(ContentService.MimeType.JSON);
    
    return output;
    
  } catch (error) {
    Logger.log('doGet Error: ' + error.toString());
    const errorResponse = { success: false, message: error.toString() };
    const callback = e.parameter.callback;
    
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errorResponse) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
