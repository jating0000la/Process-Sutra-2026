// Script to import Order Tracker workflow rules based on the provided flowchart
// Run this to populate the database with the complete Order Tracker workflow

const orderTrackerRules = [
  {
    system: "Dispatch FMS",
    currentTask: "Ask For Feedback And References ",
    status: "Done",
    nextTask: "",
    tat: 1,
    tatType: "Hour",
    doer: "",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "Confirm from Client of Dispatch",
    status: "Dispatched",
    nextTask: "Ask For Feedback And References ",
    tat: 1,
    tatType: "Hour",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formid: "feedback"
  },
  {
    system: "Dispatch FMS",
    currentTask: "Confirm from Client of Dispatch",
    status: "Not Recieved",
    nextTask: "Confirm the dispatch from the courier company",
    tat: 1,
    tatType: "Day",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "Confirm the dispatch from the courier company",
    status: "Done",
    nextTask: "Confirm from Client of Dispatch",
    tat: 1,
    tatType: "Hour",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "Material Gate Out",
    status: "Done",
    nextTask: "Send Invoice and Dispatch Details to Client",
    tat: 1,
    tatType: "Hour",
    doer: "Account Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "Prepare Invoice",
    status: "Done",
    nextTask: "Verify Invoice",
    tat: 1,
    tatType: "Hour",
    doer: "Account Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "Schedule Dispatch",
    status: "Done",
    nextTask: "Prepare Invoice",
    tat: 1,
    tatType: "Hour",
    doer: "Account Executive",
    email: "jatin@muxro.com",
    formid: "invoice"
  },
  {
    system: "Dispatch FMS",
    currentTask: "Send Invoice and Dispatch Details to Client",
    status: "Done",
    nextTask: "Confirm the dispatch from the courier company",
    tat: 3,
    tatType: "Day",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "Verify Invoice",
    status: "Done",
    nextTask: "Material Gate Out",
    tat: 1,
    tatType: "Day",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Dispatch FMS",
    currentTask: "",
    status: "",
    nextTask: "Schedule Dispatch",
    tat: 1,
    tatType: "Hour",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: "dispatch_form"
  },
  {
    system: "Order FMS",
    currentTask: "Ask to Reciever about the Material Location",
    status: "Done",
    nextTask: "Schedule Dispatch",
    tat: 1,
    tatType: "Day",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "No",
    nextTask: "Ask to Reciever about the Material Location",
    tat: 1,
    tatType: "Hour",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "No",
    nextTask: "Raise Indent",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: "raise_indent"
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "Partial Available",
    nextTask: "Raise Indent",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: "raise_indent"
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "Partial Available",
    nextTask: "Schedule Dispatch",
    tat: 1,
    tatType: "Hour",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "Yes",
    nextTask: "Dispatch Material",
    tat: 1,
    tatType: "Hour",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material in Inventory",
    status: "Yes",
    nextTask: "Schedule Dispatch",
    tat: 1,
    tatType: "Hour",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material Received or Not",
    status: "No",
    nextTask: "Check Material Received or Not",
    tat: 1,
    tatType: "Hour",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Check Material Received or Not",
    status: "Yes",
    nextTask: "Check Material in Inventory",
    tat: 1,
    tatType: "Day",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Collect Rates form 3 vendors",
    status: "Done",
    nextTask: "Take Approval from MD",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Inform to Client About Expected time",
    status: "Done",
    nextTask: "Check Material Received or Not",
    tat: 3,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Order Punch",
    status: "Done",
    nextTask: "Check Material in Inventory",
    tat: 1,
    tatType: "Hour",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Raise Indent",
    status: "Done",
    nextTask: "Collect Rates form 3 vendors",
    tat: 2,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Raise PO for Purchase",
    status: "Done",
    nextTask: "Inform to Client About Expected time",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Schedule Dispatch",
    status: "Done",
    nextTask: "",
    tat: 1,
    tatType: "Hour",
    doer: "",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order FMS",
    currentTask: "Take Approval from MD",
    status: "Approved",
    nextTask: "Raise PO for Purchase",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: "po"
  },
  {
    system: "Order FMS",
    currentTask: "Take Approval from MD",
    status: "Decline",
    nextTask: "Collect Rates form 3 vendors",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: "rates"
  },
  {
    system: "Order FMS",
    currentTask: "",
    status: "",
    nextTask: "Order Punch",
    tat: 1,
    tatType: "Hour",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formid: "order"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Add Sample in Inventory",
    status: "Done",
    nextTask: "Dispatch Schedule for Sample",
    tat: 1,
    tatType: "Hour",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Ask Customer to Parital Delivery",
    status: "No",
    nextTask: "Create BOM",
    tat: 1,
    tatType: "Hour",
    doer: "Production Manager",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Ask Customer to Parital Delivery",
    status: "Yes",
    nextTask: "Dispatch Material",
    tat: 1,
    tatType: "Hour",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Check Material in Inventory",
    status: "No",
    nextTask: "Raise Indent",
    tat: 1,
    tatType: "Hour",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: "raise_indent"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Check Material in Inventory",
    status: "Partial Available",
    nextTask: "Ask Customer to Parital Delivery",
    tat: 1,
    tatType: "Hour",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Check Material in Inventory",
    status: "Yes",
    nextTask: "Dispatch Material",
    tat: 1,
    tatType: "Hour",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Check Sample in Inventory",
    status: "No",
    nextTask: "Create Job Card form Sample Production",
    tat: 1,
    tatType: "Hour",
    doer: "Production Manager",
    email: "jatin@muxro.com",
    formid: "jobcard"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Check Sample in Inventory",
    status: "Yes",
    nextTask: "Dispatch Material",
    tat: 1,
    tatType: "Hour",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Collect Design Parameter and Production Instruction from Prod. Manager",
    status: "Done",
    nextTask: "Production Complete",
    tat: 1,
    tatType: "Hour",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Collect Design Parameter of sample and Production Instruction from Prod. Manager",
    status: "Done",
    nextTask: "Sample Production Complete",
    tat: 1,
    tatType: "Hour",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Collect Rates form 3 vendors",
    status: "Done",
    nextTask: "Take Approval from MD",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Create BOM",
    status: "Done",
    nextTask: "Raise Indent",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: "raise_indent"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Create Job Card form production",
    status: "Done",
    nextTask: "Get Material From Store",
    tat: 1,
    tatType: "Hour",
    doer: "Production Manager",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Create Job Card form production",
    status: "Done",
    nextTask: "Issue Material to Production Team",
    tat: 1,
    tatType: "Hour",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Create Job Card form Sample Production",
    status: "Done",
    nextTask: "Get Material From Store for Sample",
    tat: 1,
    tatType: "Hour",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Create Job Card form Sample Production",
    status: "Done",
    nextTask: "Issue Material to Production Team for Sample",
    tat: 1,
    tatType: "Hour",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Dispatch Material",
    status: "Done",
    nextTask: "",
    tat: 1,
    tatType: "Hour",
    doer: "",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Dispatch Schedule for Sample",
    status: "Done",
    nextTask: "",
    tat: 1,
    tatType: "Hour",
    doer: "",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Do Followup with Supplier",
    status: "Done",
    nextTask: "Material Received",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Get Material From Store",
    status: "Done",
    nextTask: "Collect Design Parameter and Production Instruction from Prod. Manager",
    tat: 1,
    tatType: "Hour",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Get Material From Store for Sample",
    status: "Done",
    nextTask: "Collect Design Parameter of sample and Production Instruction from Prod. Manager",
    tat: 1,
    tatType: "Hour",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Issue Material to Production Team",
    status: "Done",
    nextTask: "",
    tat: 1,
    tatType: "Hour",
    doer: "",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Issue Material to Production Team for Sample",
    status: "Done",
    nextTask: "",
    tat: 1,
    tatType: "Hour",
    doer: "",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Material Received",
    status: "No",
    nextTask: "Do Followup with Supplier",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Material Received",
    status: "Yes",
    nextTask: "Store Material In Store",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Move to Store",
    status: "Done",
    nextTask: "Check Material in Inventory",
    tat: 1,
    tatType: "Hour",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Order Punch",
    status: "Done",
    nextTask: "Check Material in Inventory",
    tat: 1,
    tatType: "Hour",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Order Punch",
    status: "Done",
    nextTask: "Sample Required",
    tat: 1,
    tatType: "Hour",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Production Complete",
    status: "Done",
    nextTask: "Quality Check",
    tat: 1,
    tatType: "Hour",
    doer: "QC Engg",
    email: "jatin@muxro.com",
    formid: "qcchecklist"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Quality Check",
    status: "Done",
    nextTask: "Move to Store",
    tat: 1,
    tatType: "Hour",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Quality Check",
    status: "Fail",
    nextTask: "Create Job Card form Sample Production",
    tat: 1,
    tatType: "Hour",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formid: "jobcardsample"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Quality Check",
    status: "Pass",
    nextTask: "Store Sample",
    tat: 1,
    tatType: "Hour",
    doer: "Production Supervisior",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Raise Indent",
    status: "Done",
    nextTask: "Collect Rates form 3 vendors",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: "rates"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Raise PO for Purchase",
    status: "Done",
    nextTask: "Do Followup with Supplier",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Sample Production Complete",
    status: "Done",
    nextTask: "Quality Check",
    tat: 1,
    tatType: "Hour",
    doer: "QC Engg",
    email: "jatin@muxro.com",
    formid: "qcchecklist"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Sample Required",
    status: "No",
    nextTask: "Check Material in Inventory",
    tat: 1,
    tatType: "Hour",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Sample Required",
    status: "Yes",
    nextTask: "Check Sample in Inventory",
    tat: 1,
    tatType: "Hour",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Store Material In Store",
    status: "Done",
    nextTask: "Create Job Card form production",
    tat: 1,
    tatType: "Hour",
    doer: "Production Manager",
    email: "jatin@muxro.com",
    formid: "jobcard"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Store Sample",
    status: "Done",
    nextTask: "Add Sample in Inventory",
    tat: 1,
    tatType: "Hour",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Order Manufacturer",
    currentTask: "Take Approval from MD",
    status: "Approved",
    nextTask: "Raise PO for Purchase",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: "po"
  },
  {
    system: "Order Manufacturer",
    currentTask: "Take Approval from MD",
    status: "Decline",
    nextTask: "Collect Rates form 3 vendors",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: "rates"
  },
  {
    system: "Order Manufacturer",
    currentTask: "",
    status: "",
    nextTask: "Order Punch",
    tat: 1,
    tatType: "Hour",
    doer: "Sales Executive",
    email: "jatin@muxro.com",
    formid: "order"
  },
  {
    system: "Purchase FMS",
    currentTask: "choose Vendor and take rate",
    status: "Done",
    nextTask: "take approval from MD",
    tat: 1,
    tatType: "Day",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Purchase FMS",
    currentTask: "Followup",
    status: "Done",
    nextTask: "Followup 2 days before of tat",
    tat: 1,
    tatType: "Day",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Purchase FMS",
    currentTask: "Followup 2 days before of tat",
    status: "Done",
    nextTask: "Received Material",
    tat: 1,
    tatType: "Hour",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Purchase FMS",
    currentTask: "Generate PO",
    status: "Done",
    nextTask: "Followup",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Purchase FMS",
    currentTask: "Quality check",
    status: "Done",
    nextTask: "Dispatch Material",
    tat: 1,
    tatType: "Day",
    doer: "Dispatch Executive",
    email: "jatin@muxro.com",
    formid: "dispatchid"
  },
  {
    system: "Purchase FMS",
    currentTask: "Raise Indent",
    status: "Done",
    nextTask: "choose Vendor and take rate",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: "rate"
  },
  {
    system: "Purchase FMS",
    currentTask: "Received Material",
    status: "Done",
    nextTask: "Store Material",
    tat: 1,
    tatType: "Day",
    doer: "Store Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Purchase FMS",
    currentTask: "Store Material",
    status: "Done",
    nextTask: "Quality check",
    tat: 1,
    tatType: "Hour",
    doer: "QC Engg",
    email: "jatin@muxro.com",
    formid: "qcchecklist"
  },
  {
    system: "Purchase FMS",
    currentTask: "take approval from MD",
    status: "Approved",
    nextTask: "Generate PO",
    tat: 1,
    tatType: "Hour",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: "po"
  },
  {
    system: "Purchase FMS",
    currentTask: "take approval from MD",
    status: "Decline",
    nextTask: "",
    tat: 1,
    tatType: "Day",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: ""
  },
  {
    system: "Purchase FMS",
    currentTask: "",
    status: "",
    nextTask: "Raise Indent",
    tat: 1,
    tatType: "Day",
    doer: "Purchase Executive",
    email: "jatin@muxro.com",
    formid: "raise_indent"
  }
]
//   // Initial flow - start with Customer Registration
//   [{ 
//     system: "Order Tracker", 
//     currentTask: "", 
//     status: "", 
//     nextTask: "Customer Registration", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Jitendra", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Customer Registration branches
//   { 
//     system: "Order Tracker", 
//     currentTask: "Customer Registration", 
//     status: "Regular", 
//     nextTask: "Choose Box", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Kamal", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
//   { 
//     system: "Order Tracker", 
//     currentTask: "Customer Registration", 
//     status: "Wedding", 
//     nextTask: "Get All details of Customisation and take Approval", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Rohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Choose Box flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Choose Box", 
//     status: "Done", 
//     nextTask: "Choose Sweets", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Ajay", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Choose Sweets flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Choose Sweets", 
//     status: "Done", 
//     nextTask: "Any Basic Customisation", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Mohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Any Basic Customisation branches
//   { 
//     system: "Order Tracker", 
//     currentTask: "Any Basic Customisation", 
//     status: "Yes", 
//     nextTask: "Get All details of Customisation", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Kashsis", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
//   { 
//     system: "Order Tracker", 
//     currentTask: "Any Basic Customisation", 
//     status: "No", 
//     nextTask: "Create Order for Sweets", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Jitendra", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Get All details of Customisation flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Get All details of Customisation", 
//     status: "Done", 
//     nextTask: "Create Order for Sweets", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Mohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Create Order for Sweets flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Create Order for Sweets", 
//     status: "Done", 
//     nextTask: "Check Sweet Availability in Store", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Kamal", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Check Sweet Availability in Store branches
//   { 
//     system: "Order Tracker", 
//     currentTask: "Check Sweet Availability in Store", 
//     status: "No", 
//     nextTask: "Prepare BOM of Sweets", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Rohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
//   { 
//     system: "Order Tracker", 
//     currentTask: "Check Sweet Availability in Store", 
//     status: "Yes", 
//     nextTask: "Execute Filling in Store", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Ajay", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Prepare BOM of Sweets flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Prepare BOM of Sweets", 
//     status: "Done", 
//     nextTask: "Check RM in Store", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Mohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Check RM in Store branches
//   { 
//     system: "Order Tracker", 
//     currentTask: "Check RM in Store", 
//     status: "Yes", 
//     nextTask: "Plan for Production", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Kashsis", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
//   { 
//     system: "Order Tracker", 
//     currentTask: "Check RM in Store", 
//     status: "No", 
//     nextTask: "Raise Indent", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Jitendra", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Plan for Production flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Plan for Production", 
//     status: "Done", 
//     nextTask: "Execute Production", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Mohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Execute Production flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Execute Production", 
//     status: "Done", 
//     nextTask: "Get Sweet and box from Production and Store", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Kamal", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Raise Indent flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Raise Indent", 
//     status: "Done", 
//     nextTask: "Choose Vendor", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Rohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Choose Vendor flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Choose Vendor", 
//     status: "Done", 
//     nextTask: "Generate PO", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Ajay", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Generate PO flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Generate PO", 
//     status: "Done", 
//     nextTask: "Received Material", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Jitendra", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Received Material flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Received Material", 
//     status: "Done", 
//     nextTask: "Plan for Production", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Kamal", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Get Sweet and box from Production and Store flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Get Sweet and box from Production and Store", 
//     status: "Done", 
//     nextTask: "Take Approval from Head", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Rohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Take Approval from Head branches
//   { 
//     system: "Order Tracker", 
//     currentTask: "Take Approval from Head", 
//     status: "Yes", 
//     nextTask: "Execute Demo filling", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Ajay", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
//   { 
//     system: "Order Tracker", 
//     currentTask: "Take Approval from Head", 
//     status: "No", 
//     nextTask: "Get Sweet and box from Production and Store(2)", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Mohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Get Sweet and box from Production and Store(2) flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Get Sweet and box from Production and Store(2)", 
//     status: "Done", 
//     nextTask: "Take Approval from Head(2)", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Kashsis", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Take Approval from Head(2) branches
//   { 
//     system: "Order Tracker", 
//     currentTask: "Take Approval from Head(2)", 
//     status: "Yes", 
//     nextTask: "Execute Demo filling", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Jitendra", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Execute Demo filling flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Execute Demo filling", 
//     status: "Done", 
//     nextTask: "Take Approval from Sales Person", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Mohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Take Approval from Sales Person branches
//   { 
//     system: "Order Tracker", 
//     currentTask: "Take Approval from Sales Person", 
//     status: "Yes", 
//     nextTask: "Execute to Filling in Unit", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Kamal", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
//   { 
//     system: "Order Tracker", 
//     currentTask: "Take Approval from Sales Person", 
//     status: "No", 
//     nextTask: "Execute Demo filling(2)", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Rohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Execute Demo filling(2) flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Execute Demo filling(2)", 
//     status: "Done", 
//     nextTask: "Take Approval from Sales Person(2)", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Ajay", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Take Approval from Sales Person(2) branches
//   { 
//     system: "Order Tracker", 
//     currentTask: "Take Approval from Sales Person(2)", 
//     status: "Yes", 
//     nextTask: "Execute to Filling in Unit", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Mohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Execute Filling in Store flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Execute Filling in Store", 
//     status: "Done", 
//     nextTask: "Final Dispatch", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Kashsis", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Execute to Filling in Unit flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Execute to Filling in Unit", 
//     status: "Done", 
//     nextTask: "Dispatch to Store", 
//     tat: 1, 
//     tatType: "Day", 
//     doer: "Jitendra", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   },
  
//   // Dispatch to Store flow
//   { 
//     system: "Order Tracker", 
//     currentTask: "Dispatch to Store", 
//     status: "Done", 
//     nextTask: "Final Dispatch", 
//     tat: 1, 
//     tatType: "Hour", 
//     doer: "Mohit", 
//     email: "jatin@muxro.com",
//     formId: "" 
//   }
// ];


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