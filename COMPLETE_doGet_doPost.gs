/**
 * Handle GET requests (for fetching records)
 * UPDATED: Supports both GET and POST methods
 */
function doGet(e) {
  try {
    // ✅ Support both GET and POST
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
    
    Logger.log('Action: ' + action);
    
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
 * Handle POST requests - redirect to doGet
 */
function doPost(e) {
  // POST requests also go through doGet
  return doGet(e);
}
