function doPost(e) {
  try {
    // Get the request data
    const payload = e.postData.contents;
    
    // Log raw request for debugging (optional - comment out in production)
    // SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Logs').appendRow([new Date(), payload]);
    
    // Verify webhook signature (IMPORTANT for security)
    const receivedSignature = e.parameter['X-Webhook-Signature'];
    const webhookSecret = 'dfsafgsgdfsgfsfgdsdzvjcgjghvjjkbkggb'; // Replace with your actual secret
    
    if (receivedSignature && webhookSecret) {
      const expectedSignature = Utilities.computeHmacSha256Signature(payload, webhookSecret)
        .map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2))
        .join('');
      
      if (receivedSignature !== expectedSignature) {
        Logger.log('Invalid webhook signature');
        return ContentService
          .createTextOutput(JSON.stringify({error: 'Invalid signature'}))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Parse the webhook payload
    const webhookData = JSON.parse(payload);
    const webhookId = webhookData.id;
    const webhookType = webhookData.type;
    const data = webhookData.data; // This is the actual event data
    
    Logger.log('Webhook received:', webhookType);
    Logger.log('Data:', JSON.stringify(data));
    
    // Handle different webhook types
    switch(webhookType) {
      case 'flow.started':
      case 'flow.resumed':
        handleFlowStarted(data, webhookType);
        break;
      case 'form.submitted':
        handleFormSubmitted(data);
        break;
      default:
        Logger.log('Unknown webhook type:', webhookType);
    }
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true, 
        received: webhookId,
        type: webhookType,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Webhook processing error:', error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleFlowStarted(data, eventType) {
  // Process flow started/resumed event
  Logger.log('Flow event:', eventType, data);
  
  // Example: Log to Google Sheets
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('FlowEvents');
  if(!sheet) {
    sheet = ss.insertSheet('FlowEvents');
    // Add headers
    sheet.appendRow([
      'Timestamp',
      'Event Type',
      'Flow ID',
      'Order Number',
      'System',
      'Description',
      'Initiated By',
      'Initiated At',
      'Task ID',
      'Task Name',
      'Task Assignee',
      'Task Status',
      'Task Due Date'
    ]);
  }
  
  // Extract task information safely
  const task = data.task || {};
  
  sheet.appendRow([
    new Date(),
    eventType,
    data.flowId || 'N/A',
    data.orderNumber || 'N/A',
    data.system || 'N/A',
    data.description || 'N/A',
    data.initiatedBy || 'N/A',
    data.initiatedAt || 'N/A',
    task.id || 'N/A',
    task.name || 'N/A',
    task.assignee || 'N/A',
    task.status || 'N/A',
    task.dueDate || 'N/A'
  ]);
  
  Logger.log('Flow event logged successfully');
  return;
}



// Test function to verify webhook is working
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ProcessSutra webhook endpoint is active',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}



function getSheetId(data){
  var formId = data.formId;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var index = ss.getSheetByName('Index');
  
  if(!index) {
    index = ss.insertSheet('Index');
    index.appendRow(["Form ID", "Sheet ID", "Created At"]);
  }
  
  try {
    var values = index.getDataRange().getValues();
    // Skip header row and find matching formId
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === formId) {
        var sheetId = values[i][1];
        Logger.log('Found existing sheet ID:', sheetId);
        return sheetId;
      }
    }
  } catch(e) {
    Logger.log('Error searching index:', e);
  }
  
  // Create new spreadsheet for this form
  Logger.log('Creating new spreadsheet for form:', formId);
  var newSpreadsheet = SpreadsheetApp.create('Form_' + formId);
  var sheetId = newSpreadsheet.getId();
  index.appendRow([formId, sheetId, new Date()]);
  
  return sheetId;
}




function handleFormSubmitted(data) {
  /**
   * Handle form.submitted webhook event
   * Data structure:
   * {
   *   responseId, taskId, flowId, formId,
   *   formData: { "Field Name": value, ... }, // Already transformed to readable names!
   *   _rawFormData: { "col_xxx": value }, // Original for reference
   *   submittedBy, orderNumber, timestamp
   * }
   */
  Logger.log('Form submitted:', data);
  processFormSubmission(data);
}


function processFormSubmission(data) {
  try {
    let ss = SpreadsheetApp.openById(getSheetId(data));
    const formId = data.formId;
    let mainSheet = ss.getSheetByName(formId);
    
    if (!mainSheet) {
      mainSheet = ss.insertSheet(formId);
    }

    const flatMain = flattenMainData(data);
    const dataKeys = Object.keys(flatMain);

    // Initialize headers if sheet is empty
    if (mainSheet.getLastRow() === 0) {
      mainSheet.appendRow(dataKeys);
      // Format header row
      mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).setFontWeight('bold');
      Logger.log('Initialized headers:', dataKeys.length + ' columns');
    }

    // Update headers with any new fields
    updateHeaders(mainSheet, dataKeys);

    // CRITICAL: Re-fetch headers after update to ensure sync
    const currentLastCol = mainSheet.getLastColumn();
    if (currentLastCol === 0) {
      Logger.log('ERROR: Sheet has no columns after header update');
      throw new Error('Sheet header initialization failed');
    }
    
    const headers = mainSheet.getRange(1, 1, 1, currentLastCol).getValues()[0];
    Logger.log('Current headers:', headers.length + ' columns');
    Logger.log('Data keys:', dataKeys.length + ' fields');
    
    // Validate header-data alignment
    const missingInHeaders = dataKeys.filter(k => !headers.includes(k));
    if (missingInHeaders.length > 0) {
      Logger.log('WARNING: Data keys missing in headers:', missingInHeaders);
      throw new Error('Header mismatch: ' + missingInHeaders.join(', '));
    }
    
    // Write data row with explicit header mapping
    const row = headers.map(h => {
      const value = flatMain[h];
      return value !== undefined && value !== null ? value : "";
    });
    
    Logger.log('Writing row with ' + row.length + ' values to match ' + headers.length + ' headers');
    mainSheet.appendRow(row);

    // Handle table fields (arrays of objects) separately
    if (data.formData) {
      Object.keys(data.formData).forEach(key => {
        const value = data.formData[key];

        if (Array.isArray(value) && isArrayOfObjects(value)) {
          saveArrayObjectSheet(ss, formId, key, data, value);
        }
      });
    }
    
    Logger.log('Form submission processed successfully');
    return;
  } catch(e) {
    Logger.log('Error processing form submission:', e.toString());
    throw e;
  }
}


function flattenMainData(payload) {
  let flat = {};

  // Top-level keys except formData and _rawFormData
  Object.keys(payload).forEach(k => {
    if (k !== "formData" && k !== "_rawFormData") {
      flat[k] = payload[k];
    }
  });

  // Now process the transformed form fields (with readable names)
  const fd = payload.formData;
  
  if (!fd) {
    Logger.log('Warning: No formData found in payload');
    return flat;
  }

  Object.keys(fd).forEach(key => {
    const value = fd[key];

    if (Array.isArray(value)) {
      if (isArrayOfObjects(value)) {
        // Skip table fields - handled separately
        return;
      }
      // Join array values with comma
      flat[key] = value.join(", ");
    }
    else if (typeof value === "object" && value !== null) {
      // Special case: file upload - handle both new format (string URL) and old format (object)
      if (value.type === "file" && (value.driveFileId || value.url)) {
        flat[key + "_filename"] = value.originalName || '';
        flat[key + "_mimetype"] = value.mimeType || '';
        flat[key + "_size"] = value.size || '';
        flat[key + "_url"] = value.url || `https://drive.google.com/file/d/${value.driveFileId}/view`;
      }
      else {
        // Flatten nested objects with dot notation
        Object.assign(flat, deepFlatten(value, key));
      }
    }
    else if (typeof value === "string" && (value.startsWith("https://drive.google.com") || value.includes("drive.google.com"))) {
      // New format: just a URL string
      flat[key] = value;
      flat[key + "_url"] = value;
    }
    else {
      // Simple scalar value
      flat[key] = value;
    }
  });

  return flat;
}



function deepFlatten(obj, parent = "", res = {}) {
  /**
   * Recursively flatten nested objects with dot notation
   * Example: {address: {city: "NYC"}} -> {"address.city": "NYC"}
   */
  Object.keys(obj).forEach(k => {
    const fullKey = parent ? parent + "." + k : k;
    const val = obj[k];

    if (val === null || val === undefined) {
      res[fullKey] = "";
    }
    else if (Array.isArray(val)) {
      res[fullKey] = val.join(", ");
    }
    else if (typeof val === "object") {
      deepFlatten(val, fullKey, res);
    } 
    else {
      res[fullKey] = val;
    }
  });

  return res;
}


function saveArrayObjectSheet(ss, formId, key, payload, items) {
  /**
   * Save table/array data to a separate sheet
   * Example: "Order Items" field with multiple rows
   */
  try {
    const sheetName = formId + "_" + key;
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // Generate dynamic headers including linking fields
    const itemHeaders = ["responseId", "taskId", "orderNumber", "timestamp", ...Object.keys(items[0] || {})];

    // Initialize headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(itemHeaders);
      sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
      Logger.log('Initialized table sheet headers:', itemHeaders.length + ' columns');
    }

    // Update headers with any new fields
    updateHeaders(sheet, itemHeaders);

    // CRITICAL: Re-fetch headers after update
    const currentLastCol = sheet.getLastColumn();
    if (currentLastCol === 0) {
      Logger.log('ERROR: Table sheet has no columns');
      throw new Error('Table sheet header initialization failed');
    }
    
    const headers = sheet.getRange(1, 1, 1, currentLastCol).getValues()[0];
    Logger.log('Table sheet current headers:', headers.length + ' columns');

    // Add every row from the array
    items.forEach((item, index) => {
      let rowObj = {};
      rowObj["responseId"] = payload.responseId;
      rowObj["taskId"] = payload.taskId;
      rowObj["orderNumber"] = payload.orderNumber;
      rowObj["timestamp"] = payload.timestamp;

      // Add all fields from the item
      Object.keys(item).forEach(k => rowObj[k] = item[k]);

      // Validate all required keys exist in headers
      const rowKeys = Object.keys(rowObj);
      const missingKeys = rowKeys.filter(k => !headers.includes(k));
      if (missingKeys.length > 0) {
        Logger.log('WARNING: Row ' + index + ' has keys missing from headers:', missingKeys);
      }

      const row = headers.map(h => {
        const value = rowObj[h];
        return value !== undefined && value !== null ? value : "";
      });
      
      Logger.log('Writing table row ' + index + ' with ' + row.length + ' values');
      sheet.appendRow(row);
    });
    
    Logger.log('Table data saved to sheet:', sheetName);
  } catch(e) {
    Logger.log('Error saving array object sheet:', e.toString());
    throw e;
  }
}



function updateHeaders(sheet, newKeys) {
  /**
   * Dynamically add new columns if they don't exist
   * This allows the sheet to adapt to new form fields
   */
  try {
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) {
      return; // Empty sheet, headers will be added when first row is appended
    }
    
    const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const existingSet = new Set(existing);
    let addedCount = 0;

    newKeys.forEach(k => {
      if (!existingSet.has(k)) {
        // Get current last column (updates as we add columns)
        const currentLastCol = sheet.getLastColumn();
        // Insert new column at the end
        sheet.insertColumnAfter(currentLastCol);
        const newColIndex = currentLastCol + 1;
        sheet.getRange(1, newColIndex).setValue(k);
        sheet.getRange(1, newColIndex).setFontWeight('bold');
        addedCount++;
        Logger.log('Added new header column: ' + k + ' at position ' + newColIndex);
      }
    });
    
    if (addedCount > 0) {
      Logger.log('Updated headers: added ' + addedCount + ' new columns');
    }
  } catch(e) {
    Logger.log('Error updating headers:', e.toString());
    throw e;
  }
}


function isArrayOfObjects(arr) {
  /**
   * Check if an array contains objects (table data)
   * Returns false for arrays of primitives
   */
  if (!Array.isArray(arr)) return false;
  return arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null && !Array.isArray(arr[0]);
}


// ============================================
// TESTING AND DEBUGGING FUNCTIONS
// ============================================

function testWebhookLocally() {
  /**
   * Test the webhook handler with sample data
   * Useful for debugging without making real HTTP requests
   */
  
  // Sample flow.started event
  const flowStartedPayload = {
    id: "webhook_test_123",
    type: "flow.started",
    test: true,
    createdAt: new Date().toISOString(),
    data: {
      flowId: "flow_test_abc123",
      orderNumber: "ORD-TEST-123",
      system: "Test System",
      description: "Test flow",
      initiatedBy: "test@example.com",
      initiatedAt: new Date().toISOString(),
      task: {
        id: "task_test_xyz",
        name: "First Task",
        assignee: "assignee@example.com",
        status: "pending",
        dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString()
      }
    }
  };
  
  handleFlowStarted(flowStartedPayload.data, flowStartedPayload.type);
  Logger.log('Flow test completed');
  
  // Sample form.submitted event
  const formSubmittedPayload = {
    id: "webhook_test_456",
    type: "form.submitted",
    test: true,
    createdAt: new Date().toISOString(),
    data: {
      responseId: "resp_test_789",
      taskId: "task_test_xyz",
      flowId: "flow_test_abc123",
      formId: "form_test",
      formData: {
        "Customer Name": "John Doe",
        "Email": "john@example.com",
        "Phone": "+1-555-0123",
        "Order Items": [
          { "Product": "Widget A", "Quantity": 10, "Price": 99.99 },
          { "Product": "Widget B", "Quantity": 5, "Price": 149.99 }
        ],
        "Notes": "Test order with readable field names"
      },
      submittedBy: "user@example.com",
      orderNumber: "ORD-TEST-123",
      timestamp: new Date().toISOString()
    }
  };
  
  handleFormSubmitted(formSubmittedPayload.data);
  Logger.log('Form test completed');
}
