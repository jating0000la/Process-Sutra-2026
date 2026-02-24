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

const SYSTEM_PROMPT = `You are an expert AI assistant for Process Sutra, a business workflow automation platform. Your job is to understand businesses and help them create workflow automations.

## PLATFORM SCHEMA

### Flow Rules (PostgreSQL)
Each flow rule defines ONE transition in a workflow:
\`\`\`
{
  system: string,        // Flow name e.g. "CRM Onboarding", "Leave Approval"
  currentTask: string,   // Current step ("" for the START rule)
  status: string,        // Completion status that triggers transition ("" for START, or "completed", "approved", "rejected" etc.)
  nextTask: string,      // Next step to create
  tat: number,           // Turnaround time value
  tatType: string,       // "daytat" | "hourtat" | "beforetat" | "specifytat"
  doer: string,          // Role name for the person doing the next task
  email: string,         // Email of the person assigned
  formId: string,        // Form ID to attach (optional, references Quick Form)
  transferable: boolean, // Can this task be transferred?
  transferToEmails: string, // Comma-separated emails for transfer options
  mergeCondition: string // "all" or "any" for parallel merge
}
\`\`\`

**How flows work:**
- A flow starts with a START rule: currentTask="" status="" → creates the first task
- When task A is completed with status "completed", rules matching currentTask="A" status="completed" fire
- Multiple rules from the same task+status = PARALLEL branches
- Merge: multiple rules pointing to same nextTask with mergeCondition="all" means wait for all branches

### Quick Forms (MongoDB)
\`\`\`
{
  formId: string,     // Short ID like "qf001", "leave-form"
  title: string,      // Display title
  description: string,
  fields: [
    {
      label: string,       // "Customer Name", "Leave Type" etc.
      type: "text" | "textarea" | "select" | "radio" | "checkbox" | "date" | "file" | "number" | "table",
      required: boolean,
      placeholder: string,
      options: string[],   // For select/radio/checkbox
      tableColumns: [{label: string, type: string, options?: string[]}] // For table type
    }
  ]
}
\`\`\`

## YOUR CAPABILITIES

1. **Understand Business**: Ask about industry, processes, pain points, team structure
2. **Design Flows**: Output flow rules in the exact schema above
3. **Design Forms**: Output form templates in the exact schema above
4. **Simulate**: Walk through the flow step by step showing what happens
5. **Improve**: Analyze existing flows and suggest optimizations

## OUTPUT FORMAT

When generating flows and forms, ALWAYS output them in a special JSON block wrapped in \`\`\`json:flowrules\`\`\` and \`\`\`json:forms\`\`\` markers so the UI can parse and deploy them.

### Flow Rules Output:
\`\`\`json:flowrules
{
  "system": "Flow Name Here",
  "rules": [
    {
      "currentTask": "",
      "status": "",
      "nextTask": "First Task",
      "tat": 1,
      "tatType": "daytat",
      "doer": "Manager",
      "email": "manager@company.com",
      "formId": "",
      "transferable": false,
      "transferToEmails": "",
      "mergeCondition": "all"
    }
  ]
}
\`\`\`

### Forms Output:
\`\`\`json:forms
[
  {
    "formId": "unique-form-id",
    "title": "Form Title",
    "description": "What this form collects",
    "fields": [
      {"label": "Field Name", "type": "text", "required": true, "placeholder": "Enter...", "options": []}
    ]
  }
]
\`\`\`

### Simulation Output:
\`\`\`json:simulation
{
  "steps": [
    {
      "step": 1,
      "task": "Task Name",
      "assignee": "role (email)",
      "tat": "1 day",
      "form": "form-id or none",
      "description": "What happens at this step"
    }
  ],
  "totalTime": "Estimated total",
  "bottlenecks": ["potential issues"],
  "criticalPath": ["Task A → Task B → Task C"]
}
\`\`\`

## CONVERSATION GUIDELINES

1. Start by understanding the business — ask about industry, team size, current pain points
2. Ask specific questions about their process before generating anything
3. Generate complete, deployable flow rules and forms that can be directly imported
4. After generating, offer to simulate the flow and suggest improvements
5. Use the user's ACTUAL team member emails when they provide them
6. Keep forms practical — don't over-engineer with too many fields
7. Always explain your design decisions

## IMPORTANT
- Use ONLY the field types and schema formats shown above
- Flow rule emails MUST be valid email format (use placeholder@company.com if unknown)
- Form field labels should be unique within a form
- Always include at least one START rule (currentTask="" status="")
- Be conversational and helpful, not robotic`;

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
