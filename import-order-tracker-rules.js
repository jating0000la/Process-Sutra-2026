// Script to import Order Tracker workflow rules based on the provided flowchart
// Run this to populate the database with the complete Order Tracker workflow

const orderTrackerRules = [
  // Initial flow - start with Customer Registration
  { 
    system: "Order Tracker", 
    currentTask: "", 
    status: "", 
    nextTask: "Customer Registration", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Jitendra", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Customer Registration branches
  { 
    system: "Order Tracker", 
    currentTask: "Customer Registration", 
    status: "Regular", 
    nextTask: "Choose Box", 
    tat: 1, 
    tatType: "Day", 
    doer: "Kamal", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  { 
    system: "Order Tracker", 
    currentTask: "Customer Registration", 
    status: "Wedding", 
    nextTask: "Get All details of Customisation and take Approval", 
    tat: 1, 
    tatType: "Day", 
    doer: "Rohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Choose Box flow
  { 
    system: "Order Tracker", 
    currentTask: "Choose Box", 
    status: "Done", 
    nextTask: "Choose Sweets", 
    tat: 1, 
    tatType: "Day", 
    doer: "Ajay", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Choose Sweets flow
  { 
    system: "Order Tracker", 
    currentTask: "Choose Sweets", 
    status: "Done", 
    nextTask: "Any Basic Customisation", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Mohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Any Basic Customisation branches
  { 
    system: "Order Tracker", 
    currentTask: "Any Basic Customisation", 
    status: "Yes", 
    nextTask: "Get All details of Customisation", 
    tat: 1, 
    tatType: "Day", 
    doer: "Kashsis", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  { 
    system: "Order Tracker", 
    currentTask: "Any Basic Customisation", 
    status: "No", 
    nextTask: "Create Order for Sweets", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Jitendra", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Get All details of Customisation flow
  { 
    system: "Order Tracker", 
    currentTask: "Get All details of Customisation", 
    status: "Done", 
    nextTask: "Create Order for Sweets", 
    tat: 1, 
    tatType: "Day", 
    doer: "Mohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Create Order for Sweets flow
  { 
    system: "Order Tracker", 
    currentTask: "Create Order for Sweets", 
    status: "Done", 
    nextTask: "Check Sweet Availability in Store", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Kamal", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Check Sweet Availability in Store branches
  { 
    system: "Order Tracker", 
    currentTask: "Check Sweet Availability in Store", 
    status: "No", 
    nextTask: "Prepare BOM of Sweets", 
    tat: 1, 
    tatType: "Day", 
    doer: "Rohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  { 
    system: "Order Tracker", 
    currentTask: "Check Sweet Availability in Store", 
    status: "Yes", 
    nextTask: "Execute Filling in Store", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Ajay", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Prepare BOM of Sweets flow
  { 
    system: "Order Tracker", 
    currentTask: "Prepare BOM of Sweets", 
    status: "Done", 
    nextTask: "Check RM in Store", 
    tat: 1, 
    tatType: "Day", 
    doer: "Mohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Check RM in Store branches
  { 
    system: "Order Tracker", 
    currentTask: "Check RM in Store", 
    status: "Yes", 
    nextTask: "Plan for Production", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Kashsis", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  { 
    system: "Order Tracker", 
    currentTask: "Check RM in Store", 
    status: "No", 
    nextTask: "Raise Indent", 
    tat: 1, 
    tatType: "Day", 
    doer: "Jitendra", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Plan for Production flow
  { 
    system: "Order Tracker", 
    currentTask: "Plan for Production", 
    status: "Done", 
    nextTask: "Execute Production", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Mohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Execute Production flow
  { 
    system: "Order Tracker", 
    currentTask: "Execute Production", 
    status: "Done", 
    nextTask: "Get Sweet and box from Production and Store", 
    tat: 1, 
    tatType: "Day", 
    doer: "Kamal", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Raise Indent flow
  { 
    system: "Order Tracker", 
    currentTask: "Raise Indent", 
    status: "Done", 
    nextTask: "Choose Vendor", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Rohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Choose Vendor flow
  { 
    system: "Order Tracker", 
    currentTask: "Choose Vendor", 
    status: "Done", 
    nextTask: "Generate PO", 
    tat: 1, 
    tatType: "Day", 
    doer: "Ajay", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Generate PO flow
  { 
    system: "Order Tracker", 
    currentTask: "Generate PO", 
    status: "Done", 
    nextTask: "Received Material", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Jitendra", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Received Material flow
  { 
    system: "Order Tracker", 
    currentTask: "Received Material", 
    status: "Done", 
    nextTask: "Plan for Production", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Kamal", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Get Sweet and box from Production and Store flow
  { 
    system: "Order Tracker", 
    currentTask: "Get Sweet and box from Production and Store", 
    status: "Done", 
    nextTask: "Take Approval from Head", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Rohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Take Approval from Head branches
  { 
    system: "Order Tracker", 
    currentTask: "Take Approval from Head", 
    status: "Yes", 
    nextTask: "Execute Demo filling", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Ajay", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  { 
    system: "Order Tracker", 
    currentTask: "Take Approval from Head", 
    status: "No", 
    nextTask: "Get Sweet and box from Production and Store(2)", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Mohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Get Sweet and box from Production and Store(2) flow
  { 
    system: "Order Tracker", 
    currentTask: "Get Sweet and box from Production and Store(2)", 
    status: "Done", 
    nextTask: "Take Approval from Head(2)", 
    tat: 1, 
    tatType: "Day", 
    doer: "Kashsis", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Take Approval from Head(2) branches
  { 
    system: "Order Tracker", 
    currentTask: "Take Approval from Head(2)", 
    status: "Yes", 
    nextTask: "Execute Demo filling", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Jitendra", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Execute Demo filling flow
  { 
    system: "Order Tracker", 
    currentTask: "Execute Demo filling", 
    status: "Done", 
    nextTask: "Take Approval from Sales Person", 
    tat: 1, 
    tatType: "Day", 
    doer: "Mohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Take Approval from Sales Person branches
  { 
    system: "Order Tracker", 
    currentTask: "Take Approval from Sales Person", 
    status: "Yes", 
    nextTask: "Execute to Filling in Unit", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Kamal", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  { 
    system: "Order Tracker", 
    currentTask: "Take Approval from Sales Person", 
    status: "No", 
    nextTask: "Execute Demo filling(2)", 
    tat: 1, 
    tatType: "Day", 
    doer: "Rohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Execute Demo filling(2) flow
  { 
    system: "Order Tracker", 
    currentTask: "Execute Demo filling(2)", 
    status: "Done", 
    nextTask: "Take Approval from Sales Person(2)", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Ajay", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Take Approval from Sales Person(2) branches
  { 
    system: "Order Tracker", 
    currentTask: "Take Approval from Sales Person(2)", 
    status: "Yes", 
    nextTask: "Execute to Filling in Unit", 
    tat: 1, 
    tatType: "Day", 
    doer: "Mohit", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Execute Filling in Store flow
  { 
    system: "Order Tracker", 
    currentTask: "Execute Filling in Store", 
    status: "Done", 
    nextTask: "Final Dispatch", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Kashsis", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Execute to Filling in Unit flow
  { 
    system: "Order Tracker", 
    currentTask: "Execute to Filling in Unit", 
    status: "Done", 
    nextTask: "Dispatch to Store", 
    tat: 1, 
    tatType: "Day", 
    doer: "Jitendra", 
    email: "jatin@muxro.com",
    formId: "" 
  },
  
  // Dispatch to Store flow
  { 
    system: "Order Tracker", 
    currentTask: "Dispatch to Store", 
    status: "Done", 
    nextTask: "Final Dispatch", 
    tat: 1, 
    tatType: "Hour", 
    doer: "Mohit", 
    email: "jatin@muxro.com",
    formId: "" 
  }
];

// Function to import rules
async function importOrderTrackerRules() {
  try {
    const response = await fetch('/api/flow-rules/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rules: orderTrackerRules })
    });
    
    const result = await response.json();
    console.log('Import result:', result);
    return result;
  } catch (error) {
    console.error('Error importing rules:', error);
    throw error;
  }
}

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { orderTrackerRules, importOrderTrackerRules };
} else {
  // Browser environment
  window.orderTrackerRules = orderTrackerRules;
  window.importOrderTrackerRules = importOrderTrackerRules;
}