/**
 * Google Apps Script for Smile Ezee Dentistry
 * Paste this into a new project at script.google.com
 * Deployment instructions:
 * 1. Click 'Deploy' -> 'New Deployment'
 * 2. Select 'Web App'
 * 3. Set 'Execute as' to 'Me'
 * 4. Set 'Who has access' to 'Anyone'
 * 5. Copy the Web App URL and paste it into your .env file as VITE_GOOGLE_SCRIPT_URL
 */

function doPost(e) {
  try {
    // 1. Open the spreadsheet by ID
    const ss = SpreadsheetApp.openById("1SW6Ga2ho7v-MxPfTdPnWiNcR8gV5lATjY1wueeXqL9g");
    const sheet = ss.getSheetByName("Sheet1") || ss.getSheets()[0];

    // 2. Extract data (Handle both JSON postData and Form parameters)
    let data = {};
    
    // Try to get data from URL parameters or Form body (e.parameter)
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;
    } 
    
    // Fallback/Override with JSON body if available
    if (e.postData && e.postData.contents) {
      try {
        const jsonBody = JSON.parse(e.postData.contents);
        data = Object.assign(data, jsonBody);
      } catch (i) {
        // Not JSON, ignore
      }
    }

    // 3. Prepare row data matching the sheet columns exactly
    const rowData = [
      data.fullName || data.name || "N/A",
      data.phone || "N/A",
      data.appointmentType || data.type || "N/A",
      data.dentalService || "N/A",
      data.preferredDate || data.date || "N/A",
      data.timeSlot || data.slot || "N/A",
      data.address || "N/A",
      data.comments || data.issue || "N/A",
      new Date(), // Timestamp
      data.source || "Website"
    ];

    // 4. Append row
    sheet.appendRow(rowData);

    // 5. Return JSON success response
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Booking Added Successfully"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    console.error("Script error:", err);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Support GET requests for testing
function doGet(e) {
  return doPost(e);
}
