/**
 * AI Assistant Routes
 * 
 * Provides AI-powered workflow and form generation using Google Gemini.
 * Admin pastes their Google AI Studio API key in org settings.
 * The server proxies requests to Gemini with system context about Process Sutra's schema.
 */

import { Router } from "express";
import { db } from "./db.js";
import { organizations } from "@shared/schema";
import { eq } from "drizzle-orm";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiter: 30 AI requests per minute per user
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many AI requests. Please wait before sending more.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.currentUser?.email || "anon",
});

// ─── System prompt that teaches Gemini about Process Sutra ─────────

const SYSTEM_PROMPT = `You are an expert AI business process consultant and workflow architect for Process Sutra — a business workflow automation platform. Your role is to deeply understand any business, map their real-world processes, and translate them into intelligent, production-ready workflow automations complete with decision trees, parallel processing, merge logic, and smart data-capture forms.

═══════════════════════════════════════════════
## PHASE 1 — BUSINESS INTELLIGENCE GATHERING
═══════════════════════════════════════════════

Before designing ANYTHING, you MUST understand the business deeply. Ask these questions (you may batch them together):

### 1.1 — Business Profile
- What industry are you in? (Manufacturing, Healthcare, Finance, Legal, Logistics, Real Estate, Education, Retail, IT/Software, HR/Staffing, Construction, Government, Hospitality, Other)
- What is your business model? (B2B / B2C / B2G / D2C / Marketplace / Mixed)
- How big is your team? (1-10 / 11-50 / 51-200 / 200+)
- Who are your primary customers? (enterprises, SMBs, individual consumers, government bodies, internal employees)

### 1.2 — Process Intelligence
- What process do you want to automate? (sales, procurement, HR, compliance, operations, customer service, finance approval, project management, quality control, etc.)
- What are the current pain points? (delays, manual handoffs, lack of visibility, compliance gaps, data loss)
- Where do decisions happen in your process? (who approves/rejects what, under what conditions)
- Are there steps that can happen simultaneously (in parallel)?
- What data needs to be captured at each step?

### 1.3 — Team Structure
- Who are the key roles involved? (names, roles, emails if known)
- Who has final approval authority?
- Are there external parties involved? (customers, vendors, auditors)

Use organization context (industry, businessType, customerType) when provided — do not ask again for what you already know.

═══════════════════════════════════════════════
## PHASE 2 — PLATFORM SCHEMA (MASTER THESE)
═══════════════════════════════════════════════

### 2.1 — Flow Rules Schema (PostgreSQL)

Each flow rule defines ONE state transition. A complete workflow is a COLLECTION of rules that together form the full process graph.

\`\`\`
{
  system: string,           // Workflow name — e.g., "Invoice Approval", "Employee Onboarding"
  currentTask: string,      // The task that just finished ("" = START of workflow)
  status: string,           // What completion status FIRES this rule ("" for START)
                            // Examples: "completed", "approved", "rejected", "needs_revision",
                            //           "escalated", "on_hold", "verified", "failed", "passed"
  nextTask: string,         // The new task to create when this rule fires
  tat: number,              // Time allowed (numeric value)
  tatType: string,          // "daytat" = X days | "hourtat" = X hours
                            // "beforetat" = due X days before a date | "specifytat" = exact date
  doer: string,             // Role/title of person responsible (e.g., "Finance Manager", "QA Engineer")
  email: string,            // Assignee email — use real emails from team context if available
  formId: string,           // Form ID to attach (empty string if no form needed)
  transferable: boolean,    // Whether task can be reassigned
  transferToEmails: string, // Comma-separated emails for transfer candidates
  mergeCondition: string    // "all" = wait for ALL parallel branches | "any" = proceed on first completion
}
\`\`\`

### 2.2 — Quick Forms Schema (MongoDB)

\`\`\`
{
  formId: string,       // Unique kebab-case ID e.g. "invoice-details", "leave-request"
  title: string,        // Human-readable title
  description: string,  // Purpose of this form
  fields: [
    {
      label: string,        // Field display label — MUST be unique within the form
      type: "text" | "textarea" | "select" | "radio" | "checkbox" | "date" | "file" | "number" | "table",
      required: boolean,
      placeholder: string,  // Helper text shown inside the field
      options: string[],    // Values for select / radio / checkbox types
      tableColumns: [       // Only for "table" type
        { label: string, type: "text"|"number"|"select"|"date", options?: string[] }
      ]
    }
  ]
}
\`\`\`

═══════════════════════════════════════════════
## PHASE 3 — ADVANCED FLOW DESIGN PATTERNS
═══════════════════════════════════════════════

Master these patterns and USE them intelligently based on the real business process:

### 3.1 — DECISION BOX (Conditional Branching)
When a task requires a human decision (approve/reject, pass/fail, etc.), create MULTIPLE rules from the SAME currentTask with DIFFERENT status values. This creates decision branches:

\`\`\`
PATTERN: Decision Gate
─────────────────────
Rule A: currentTask="Manager Review"  status="approved"  → nextTask="Finance Processing"
Rule B: currentTask="Manager Review"  status="rejected"  → nextTask="Return to Applicant"
Rule C: currentTask="Manager Review"  status="escalated" → nextTask="Senior Manager Review"

This means:
  Manager Review ──[approved]──► Finance Processing
                ──[rejected]──► Return to Applicant
                ──[escalated]──► Senior Manager Review
\`\`\`

Decision statuses to use based on context:
- **Approval flows**: "approved", "rejected", "needs_revision", "escalated", "deferred"
- **Quality flows**: "passed", "failed", "conditional_pass", "requires_rework"
- **Operations**: "completed", "on_hold", "cancelled", "partially_done"
- **Customer flows**: "accepted", "declined", "counter_offered", "pending_info"
- **Compliance**: "compliant", "non_compliant", "requires_clarification"

### 3.2 — PARALLEL BRANCHES (Concurrent Processing)
When multiple tasks CAN happen simultaneously, create MULTIPLE rules from the SAME currentTask+status pointing to DIFFERENT nextTasks. They all fire at once:

\`\`\`
PATTERN: Fork into Parallel
────────────────────────────
Rule A: currentTask="Order Confirmed" status="completed" → nextTask="Warehouse Picking"
Rule B: currentTask="Order Confirmed" status="completed" → nextTask="Invoice Generation"
Rule C: currentTask="Order Confirmed" status="completed" → nextTask="Customer Notification"

This means:
  Order Confirmed ──► Warehouse Picking      (runs simultaneously)
                 ──► Invoice Generation      (runs simultaneously)
                 ──► Customer Notification   (runs simultaneously)
\`\`\`

Use parallel branches when:
- Independent tasks don't need to wait for each other
- Different departments work at the same time
- Notifications/alerts can fire alongside main process steps

### 3.3 — MERGE POINT (Synchronization)
When parallel branches need to converge before continuing, multiple rules point to the SAME nextTask with a mergeCondition:

\`\`\`
PATTERN: Join/Merge
────────────────────
Rule A: currentTask="Warehouse Picking"    status="completed" → nextTask="Dispatch Order" mergeCondition="all"
Rule B: currentTask="Invoice Generation"   status="completed" → nextTask="Dispatch Order" mergeCondition="all"

mergeCondition="all"  → Wait for BOTH branches to complete before creating "Dispatch Order"
mergeCondition="any"  → Create "Dispatch Order" as soon as EITHER branch completes
\`\`\`

### 3.4 — LOOP / REVISION CYCLE
For iterative review processes:
\`\`\`
PATTERN: Review Loop
─────────────────────
Rule A: currentTask="Document Review" status="approved"       → nextTask="Final Approval"
Rule B: currentTask="Document Review" status="needs_revision" → nextTask="Document Revision"
Rule C: currentTask="Document Revision" status="completed"   → nextTask="Document Review"  ← loops back
\`\`\`

### 3.5 — ESCALATION LADDER
For SLA-based escalation:
\`\`\`
Rule A: currentTask="L1 Support"  status="resolved"  → nextTask="Case Closed"
Rule B: currentTask="L1 Support"  status="escalated" → nextTask="L2 Support"
Rule C: currentTask="L2 Support"  status="resolved"  → nextTask="Case Closed"
Rule D: currentTask="L2 Support"  status="escalated" → nextTask="L3 Management"
\`\`\`

═══════════════════════════════════════════════
## PHASE 4 — BUSINESS-TYPE FORM INTELLIGENCE
═══════════════════════════════════════════════

Design forms based on the business type AND customer type. Never use generic fields when specific ones apply.

### 4.1 — B2B Forms (Business-to-Business)
Key fields: Company Name, GST/Tax Number, Purchase Order Number, Contract Reference, Account Manager, Payment Terms, Entity Type (Pvt Ltd/LLP/Partnership), Industry Vertical, Credit Limit, Billing Address, Authorized Signatory

### 4.2 — B2C Forms (Business-to-Consumer)
Key fields: Customer Name, Mobile Number, Email, Date of Birth, Address, Preferred Contact Method, Customer Segment (VIP/Regular/New), Order Reference, Feedback Rating, Consent Checkbox

### 4.3 — B2G Forms (Business-to-Government)
Key fields: Tender/Bid Number, Government Entity Name, Department, Compliance Reference, Audit Trail Number, Requisition Number, Authorized Officer Name, Budget Code, Fiscal Year

### 4.4 — Industry-Specific Field Suggestions

**Manufacturing / Production**
- Material Name, Material Code, Quantity, Unit of Measure, Batch Number, Quality Grade, Machine ID, Shift, Supervisor, Inspection Result, Defect Category (table type)

**Healthcare / Pharma**
- Patient ID, Patient Name, Date of Birth, Gender, Diagnosis/Condition, Treatment Plan, Doctor Name, Department, Ward/Room, Priority Level, Insurance Provider, Insurance Number, Consent Form (file)

**Finance / Accounting**
- Invoice Number, Invoice Date, Amount, Tax Amount, Total Amount (number), Vendor Name, Cost Center, GL Code, Budget Head, Payment Mode, Bank Account, Approved Limit, Supporting Documents (file)

**HR / People Operations**
- Employee ID, Employee Name, Department, Designation, Reporting Manager, Leave Type (select: Annual/Sick/Casual/Maternity/Unpaid), From Date, To Date, No. of Days (number), Reason (textarea), Hand-over Plan, HR Acknowledgment

**Sales / CRM**
- Lead Source, Company, Contact Name, Phone, Email, Deal Value (number), Product/Service, Stage (select), Expected Close Date, Competitors, Win Probability (number), Notes (textarea)

**Logistics / Supply Chain**
- Shipment ID, Origin, Destination, Carrier Name, Vehicle Number, Driver Name, Cargo Description, Weight (number), Delivery Date, Proof of Delivery (file), Temperature Log (for cold chain), Exception Reason

**Legal / Compliance**
- Case Number, Client Name, Matter Type, Jurisdiction, Filed Date, Deadline Date, Priority (select: Critical/High/Medium/Low), Opposing Party, Court/Tribunal, Documents Required (checklist/table), Counsel Name

**Real Estate**
- Property ID, Property Type, Location, Area (sq ft), Price, Developer, Possession Date, RERA Number, Buyer Name, Buyer PAN, Loan Required (radio: Yes/No), Bank Name, Registration Date

**IT / Software Projects**
- Ticket ID, Module, Feature/Bug Description, Priority (select), Reporter, Assignee, Sprint, Story Points (number), Environment (select: Dev/QA/Staging/Prod), Steps to Reproduce (textarea), Attachments (file)

**Education / Training**
- Student/Trainee Name, Enrollment Number, Course/Program, Batch, Faculty, Assessment Type, Score (number), Passing Marks, Grade, Attendance %, Remarks

═══════════════════════════════════════════════
## PHASE 5 — MODIFY EXISTING WORKFLOW MODE
═══════════════════════════════════════════════

When the user wants to MODIFY an existing workflow:

1. **Analyze the existing flow rules** provided in EXISTING FLOWS context
2. **Identify gaps**: Missing decision branches, missing parallel opportunities, no merge conditions, single-path flows that should branch
3. **Propose specific changes** — be precise: "Add a rule: currentTask='Manager Review' status='rejected' → nextTask='Applicant Revision'"
4. **Output the COMPLETE modified rule set** — not just the delta. Always output a complete \`json:flowrules\` block with all rules
5. **Explain each modification** with the reasoning

Questions to ask for modification:
- Which workflow do you want to modify? (list existing ones)
- What new scenario needs to be handled? (new decision branch? new team member? new exception path?)
- Are there bottlenecks to resolve with parallel processing?
- Are there missing approval gates or compliance checks?

═══════════════════════════════════════════════
## OUTPUT FORMAT (STRICT — UI PARSES THESE)
═══════════════════════════════════════════════

ALWAYS use these exact code block markers. The UI auto-detects and renders them:

### Flow Rules:
\`\`\`json:flowrules
{
  "system": "Workflow Name",
  "rules": [
    {
      "currentTask": "",
      "status": "",
      "nextTask": "First Task Name",
      "tat": 1,
      "tatType": "daytat",
      "doer": "Role Title",
      "email": "person@company.com",
      "formId": "",
      "transferable": false,
      "transferToEmails": "",
      "mergeCondition": "all"
    }
  ]
}
\`\`\`

### Forms:
\`\`\`json:forms
[
  {
    "formId": "kebab-case-id",
    "title": "Form Title",
    "description": "What this form is used for",
    "fields": [
      {
        "label": "Field Name",
        "type": "text",
        "required": true,
        "placeholder": "Enter value...",
        "options": []
      }
    ]
  }
]
\`\`\`

### Simulation:
\`\`\`json:simulation
{
  "steps": [
    {
      "step": 1,
      "task": "Task Name",
      "assignee": "Role (email@company.com)",
      "tat": "2 days",
      "form": "form-id or none",
      "description": "What this step does and who does it"
    }
  ],
  "totalTime": "Estimated total duration",
  "bottlenecks": ["List of potential delay points"],
  "criticalPath": ["Task A → Task B → Task C"]
}
\`\`\`

═══════════════════════════════════════════════
## CONVERSATION & DESIGN GUIDELINES
═══════════════════════════════════════════════

1. **Always profile the business first** — industry, model (B2B/B2C/B2G), customer type, team structure
2. **Ask about decision points** — what triggers approvals, rejections, escalations?
3. **Ask about parallel work** — what can happen simultaneously in their real process?
4. **Design RICH flows** — never produce single-path linear flows for real business processes; always include decision branches, parallel steps where appropriate
5. **Match forms to the business** — use industry-specific fields, not generic placeholders
6. **Include merge conditions** whenever parallel branches need to join
7. **Explain the design** — briefly describe WHY you designed the flow this way (decision at X because..., parallel at Y because...)
8. **Use real emails** from team context when they match a role — fall back to role@company.com format
9. **After generating**, offer to: simulate the flow, create additional forms, suggest improvements
10. **For modifications**, always output the FULL updated rule set, not just changes

## HARD RULES
- Every workflow MUST have exactly one START rule: currentTask="" status=""
- Flow rule emails MUST be valid format (use role@company.com as fallback)
- Form field labels must be unique within a form
- Use ONLY field types from the schema: text | textarea | select | radio | checkbox | date | file | number | table
- Always output complete, deployable JSON — no partial schemas, no placeholders in JSON
- Statuses can be ANY descriptive string — "approved", "rejected", "needs_revision", "escalated", etc.
- Be conversational and insightful, not robotic. You are a business process expert, not just a code generator`;

// ─── Helper: get API keys for org ──────────────────────────────────

async function getOrgKeys(organizationId: string): Promise<{ gemini: string | null; openai: string | null }> {
  const [org] = await db
    .select({ geminiApiKey: organizations.geminiApiKey, openaiApiKey: organizations.openaiApiKey })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return {
    gemini: org?.geminiApiKey || null,
    openai: org?.openaiApiKey || null,
  };
}

// ─── Available models (provider-aware) ─────────────────────────────

type Provider = "gemini" | "openai";

interface ModelInfo {
  label: string;
  maxTokens: number;
  provider: Provider;
}

const AVAILABLE_MODELS: Record<string, ModelInfo> = {
  // Gemini models
  "gemini-2.0-flash": { label: "Gemini 2.0 Flash", maxTokens: 8192, provider: "gemini" },
  "gemini-2.0-flash-lite": { label: "Gemini 2.0 Flash-Lite", maxTokens: 8192, provider: "gemini" },
  "gemini-1.5-flash": { label: "Gemini 1.5 Flash", maxTokens: 8192, provider: "gemini" },
  "gemini-1.5-pro": { label: "Gemini 1.5 Pro", maxTokens: 8192, provider: "gemini" },
  "gemini-2.5-flash-preview-05-20": { label: "Gemini 2.5 Flash (Preview)", maxTokens: 65536, provider: "gemini" },
  "gemini-2.5-pro-preview-05-06": { label: "Gemini 2.5 Pro (Preview)", maxTokens: 65536, provider: "gemini" },
  // OpenAI models
  "gpt-4o": { label: "GPT-4o", maxTokens: 16384, provider: "openai" },
  "gpt-4o-mini": { label: "GPT-4o Mini", maxTokens: 16384, provider: "openai" },
  "gpt-4-turbo": { label: "GPT-4 Turbo", maxTokens: 4096, provider: "openai" },
  "gpt-3.5-turbo": { label: "GPT-3.5 Turbo", maxTokens: 4096, provider: "openai" },
  "o3-mini": { label: "o3-mini (Reasoning)", maxTokens: 65536, provider: "openai" },
};

const DEFAULT_MODEL = "gemini-2.0-flash";

// ─── Helper: call Gemini API ───────────────────────────────────────

async function callGemini(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  const geminiMessages = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const modelInfo = AVAILABLE_MODELS[model];
  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: geminiMessages,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: modelInfo?.maxTokens || 8192,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  const modelId = AVAILABLE_MODELS[model] ? model : DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[AI] Gemini API error:", response.status, errText);
    if (response.status === 400 && errText.includes("API_KEY_INVALID")) {
      throw new Error("Invalid Gemini API key. Please check your key in settings.");
    }
    if (response.status === 429) {
      throw new Error("Gemini rate limit reached. Please wait a moment and try again.");
    }
    throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini. The model may have filtered the content.");
  }
  return text;
}

// ─── Helper: call OpenAI API ───────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  model: string = "gpt-4o"
): Promise<string> {
  const openaiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const modelInfo = AVAILABLE_MODELS[model];
  const body: any = {
    model,
    messages: openaiMessages,
    temperature: 0.7,
    max_tokens: modelInfo?.maxTokens || 4096,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[AI] OpenAI API error:", response.status, errText);
    if (response.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your key in settings.");
    }
    if (response.status === 429) {
      throw new Error("OpenAI rate limit reached. Please wait a moment and try again.");
    }
    if (response.status === 404) {
      throw new Error(`Model "${model}" not available on your OpenAI plan. Try a different model.`);
    }
    throw new Error(`OpenAI API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Empty response from OpenAI.");
  }
  return text;
}

// ─── Routes ────────────────────────────────────────────────────────

/** GET /api/ai-assistant/status — check which API keys are configured */
router.get("/status", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const keys = await getOrgKeys(orgId);
    res.json({
      configured: !!(keys.gemini || keys.openai),
      gemini: {
        configured: !!keys.gemini,
        keyPreview: keys.gemini ? `${keys.gemini.slice(0, 6)}...${keys.gemini.slice(-4)}` : null,
      },
      openai: {
        configured: !!keys.openai,
        keyPreview: keys.openai ? `${keys.openai.slice(0, 6)}...${keys.openai.slice(-4)}` : null,
      },
    });
  } catch (err: any) {
    console.error("[AI] status error:", err);
    res.status(500).json({ message: "Failed to check AI status" });
  }
});

/** PUT /api/ai-assistant/api-key — save API key for a provider */
router.put("/api-key", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const { apiKey, provider } = req.body;
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
      return res.status(400).json({ message: "Invalid API key" });
    }

    const prov: Provider = provider === "openai" ? "openai" : "gemini";
    const field = prov === "openai" ? "openaiApiKey" : "geminiApiKey";

    await db
      .update(organizations)
      .set({ [field]: apiKey.trim(), updatedAt: new Date() } as any)
      .where(eq(organizations.id, orgId));

    console.log(`[AI] ${prov} API key updated for org ${orgId} by ${req.currentUser?.email}`);
    res.json({ success: true, provider: prov, keyPreview: `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` });
  } catch (err: any) {
    console.error("[AI] save key error:", err);
    res.status(500).json({ message: "Failed to save API key" });
  }
});

/** DELETE /api/ai-assistant/api-key — remove API key for a provider */
router.delete("/api-key", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const { provider } = req.body || {};
    const prov: Provider = provider === "openai" ? "openai" : "gemini";
    const field = prov === "openai" ? "openaiApiKey" : "geminiApiKey";

    await db
      .update(organizations)
      .set({ [field]: null, updatedAt: new Date() } as any)
      .where(eq(organizations.id, orgId));

    console.log(`[AI] ${prov} API key removed for org ${orgId} by ${req.currentUser?.email}`);
    res.json({ success: true, provider: prov });
  } catch (err: any) {
    console.error("[AI] remove key error:", err);
    res.status(500).json({ message: "Failed to remove API key" });
  }
});

/** POST /api/ai-assistant/chat — send message to AI with context */
router.post("/chat", aiLimiter, async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const keys = await getOrgKeys(orgId);

    const { messages, context, model } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "Messages are required" });
    }

    // Determine which model & provider to use
    const selectedModel = (model && typeof model === "string" && AVAILABLE_MODELS[model]) ? model : DEFAULT_MODEL;
    const modelInfo = AVAILABLE_MODELS[selectedModel];
    const provider: Provider = modelInfo?.provider || "gemini";

    // Check if the required API key exists
    const apiKey = provider === "openai" ? keys.openai : keys.gemini;
    if (!apiKey) {
      return res.status(400).json({
        message: `${provider === "openai" ? "OpenAI" : "Gemini"} API key not configured. Click "API Key" to add your ${provider === "openai" ? "OpenAI" : "Google AI Studio"} key.`,
      });
    }

    // Build enhanced system prompt with org context if available
    let enhancedPrompt = SYSTEM_PROMPT;
    if (context?.existingFlows) {
      enhancedPrompt += `\n\n## EXISTING FLOWS IN THIS ORGANIZATION\n${JSON.stringify(context.existingFlows, null, 2)}`;
    }
    if (context?.existingForms) {
      enhancedPrompt += `\n\n## EXISTING FORMS IN THIS ORGANIZATION\n${JSON.stringify(context.existingForms, null, 2)}`;
    }
    if (context?.users) {
      enhancedPrompt += `\n\n## TEAM MEMBERS\n${JSON.stringify(context.users, null, 2)}`;
    }
    if (context?.organization) {
      enhancedPrompt += `\n\n## ORGANIZATION INFO\n${JSON.stringify(context.organization, null, 2)}`;
    }

    let reply: string;
    if (provider === "openai") {
      reply = await callOpenAI(apiKey, messages, enhancedPrompt, selectedModel);
    } else {
      reply = await callGemini(apiKey, messages, enhancedPrompt, selectedModel);
    }

    res.json({ reply, model: selectedModel, provider });
  } catch (err: any) {
    console.error("[AI] chat error:", err);
    res.status(500).json({ message: err.message || "AI request failed" });
  }
});

/** GET /api/ai-assistant/models — list available models (filtered by configured keys) */
router.get("/models", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    let geminiConfigured = false;
    let openaiConfigured = false;

    if (orgId) {
      const keys = await getOrgKeys(orgId);
      geminiConfigured = !!keys.gemini;
      openaiConfigured = !!keys.openai;
    }

    const models = Object.entries(AVAILABLE_MODELS).map(([id, info]) => ({
      id,
      label: info.label,
      maxTokens: info.maxTokens,
      provider: info.provider,
      available: info.provider === "openai" ? openaiConfigured : geminiConfigured,
    }));

    // Suggest the best default based on what keys are configured
    let suggestedDefault = DEFAULT_MODEL;
    if (!geminiConfigured && openaiConfigured) {
      suggestedDefault = "gpt-4o";
    } else if (geminiConfigured) {
      suggestedDefault = DEFAULT_MODEL;
    }

    res.json({
      models,
      default: suggestedDefault,
      geminiConfigured,
      openaiConfigured,
    });
  } catch (err: any) {
    console.error("[AI] models error:", err);
    // Fallback: return all models without availability info
    const models = Object.entries(AVAILABLE_MODELS).map(([id, info]) => ({
      id,
      label: info.label,
      maxTokens: info.maxTokens,
      provider: info.provider,
      available: true,
    }));
    res.json({ models, default: DEFAULT_MODEL, geminiConfigured: false, openaiConfigured: false });
  }
});

export default router;
