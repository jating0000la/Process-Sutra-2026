# AI Data Safety & Privacy Policy — Voice of Business™ Report

> **Document Version:** 1.0  
> **Last Updated:** January 2025  
> **Status:** Active — Enforced in `server/analyticsRoutes.ts`

---

## 1. Overview

The **Voice of Business™** performance report optionally uses an external AI model (Google Gemini or OpenAI GPT) to generate strategic analysis and recommendations. This document details **exactly** what data is sent to the AI provider, what is **never** sent, and the safeguards in place.

---

## 2. When AI Is Invoked

| Condition | AI Called? |
|-----------|-----------|
| Admin clicks "Download Report" (default) | **No** — AI is off by default |
| Admin explicitly enables `includeAI=true` | **Yes** — only if an API key is configured |
| No API key configured in organization settings | **No** — report generates fully without AI |
| AI call fails (network error, rate limit, etc.) | **No** — report generates fully, AI section is `null` |

**The report is fully functional without AI.** All KPIs, charts, bottleneck analysis, loss cost, and team performance are computed server-side using pure mathematics — no AI dependency.

---

## 3. Data Sent to AI (Allowed List)

The AI receives **only pre-computed, aggregated statistical summaries**. The data is constructed by the `buildAIPrompt()` function in `server/analyticsRoutes.ts`.

### 3.1 Organization Context (Non-sensitive)
| Field | Example | Purpose |
|-------|---------|---------|
| Company Name | "Acme Corp" | Context for industry-specific advice |
| Industry | "Manufacturing" | Sector-relevant recommendations |

### 3.2 Aggregated KPIs (Numbers Only)
| Metric | Example | Notes |
|--------|---------|-------|
| Total Tasks | 423 | Count only |
| Completed Tasks | 312 | Count only |
| Overdue Tasks | 28 | Count only |
| Completion Rate | 74% | Pre-computed percentage |
| On-Time Rate | 68% | Pre-computed percentage |
| Throughput/Day | 4.2 | Aggregate rate |
| Throughput/Hour | 0.18 | Aggregate rate |
| Avg Cycle Time | 18.3 hours | Aggregate average |
| Business Status | "Stable but Slow" | Pre-determined label |

### 3.3 Loss Analysis (Aggregated)
| Field | Example |
|-------|---------|
| Total Delay Hours | 142.5 |
| Loss Cost (₹) | ₹71,250 |
| Cost Per Hour (₹) | ₹500 |

### 3.4 Bottleneck Summary (Top 5 Only)
For each bottleneck, **only** these fields:
- Task name (e.g., "Quality Inspection")
- Average cycle hours (e.g., 48.2)
- Overdue count (e.g., 5)
- Completion rate (e.g., 62%)

**No individual task IDs, timestamps, assignees, or raw records.**

### 3.5 System Breakdown (Aggregate Per System)
For each workflow system:
- System name (e.g., "Production")
- Total task count
- Completion rate (%)
- Overdue count

### 3.6 Team Performance (Anonymized — Counts Only)
| What AI Receives | What AI Does NOT Receive |
|-----------------|------------------------|
| Total number of team members | Individual email addresses |
| Top performer count | Specific names or identifiers |
| "Needs attention" count | Personal performance records |
| Average on-time rate | Individual task histories |

> **Important:** Doer (team member) emails are **never** sent to the AI. The prompt includes only a count like "5 team members" and aggregate statistics.

---

## 4. Data NEVER Sent to AI (Blocked List)

The following data categories are **explicitly excluded** from any AI prompt:

| Category | Examples | Why Blocked |
|----------|----------|-------------|
| **Email Addresses** | user@company.com | Personal Identifiable Information (PII) |
| **User IDs / Firebase UIDs** | abc123def456 | PII / Authentication data |
| **Individual Task Records** | Task #4521 details | Raw operational data |
| **Task Timestamps** | "Created: 2025-01-15 09:32" | Granular operational data |
| **Task Descriptions / Notes** | Free-text content | May contain sensitive info |
| **Form Responses** | Customer-submitted data | Contains PII / business secrets |
| **File Attachments** | Upload paths or content | Sensitive documents |
| **API Keys** | Gemini/OpenAI keys | Security credentials |
| **Organization Settings** | Internal config | Administrative data |
| **Database IDs** | Primary keys, foreign keys | Internal technical data |
| **IP Addresses / Tokens** | Session data | Security / PII |
| **Flow Rule Definitions** | Detailed rule configs | Proprietary business logic |
| **Financial Details** | Bank accounts, invoices | Financial PII |
| **Customer Data** | Names, contacts, orders | Third-party PII |

---

## 5. AI Prompt Design Principles

The AI prompt is carefully designed with these safeguards:

### 5.1 Instruction Framing
The AI is told:
> "You are receiving ONLY pre-computed statistical summaries. Do NOT request or reference any individual task records, personal data, or raw database information."

### 5.2 Output Constraints
The AI is instructed to **only provide**:
- Executive summary (2-3 sentences)
- Key findings (3 bullet points)
- Bottleneck root cause analysis
- Improvement recommendations
- Cost optimization opportunities
- 30-60-90 day action plan

### 5.3 No Data Return Path
The AI's response is treated as **text-only analysis**. There is no mechanism for the AI to:
- Query additional data
- Access the database
- Trigger any system actions
- Store or cache the prompt data

---

## 6. Data Truncation & Limits

To minimize data exposure, the prompt enforces strict limits:

| Data Type | Limit |
|-----------|-------|
| Bottlenecks | Max 5 entries |
| Systems | Max 5 entries |
| Team metrics | Counts only (no individual data) |
| Total prompt size | ~1,500 characters |

---

## 7. API Key Management

| Aspect | Implementation |
|--------|---------------|
| Storage | Encrypted in `organizations` table (`geminiApiKey`, `openaiApiKey`) |
| Scope | Per-organization — each org uses their own key |
| Fallback | If no key is set, AI section is silently skipped |
| Provider | Admin chooses: Google Gemini or OpenAI |

---

## 8. What Happens If AI Fails

The system is designed for **graceful degradation**:

1. **No API Key** → Report generates fully, `aiAnalysis` field is `null`
2. **API Call Fails** → Error is logged server-side, report generates fully
3. **AI Returns Empty** → Report generates fully with all other sections
4. **AI Returns Inappropriate Content** → Rendered as-is (AI providers have their own content policies)

All KPIs, charts, tables, bottleneck analysis, loss cost calculations, and team performance data are computed **entirely server-side** with zero AI dependency.

---

## 9. Compliance Notes

- **Data Minimization**: Only the minimum necessary aggregated data is shared with AI
- **No PII Transfer**: No personally identifiable information leaves the server to AI providers
- **User Control**: AI analysis is opt-in (`includeAI=true` parameter)
- **Audit Trail**: AI usage is logged via standard server logging
- **Data Retention**: No prompt data is stored after the API call completes
- **Provider Policies**: Both Google and OpenAI state they do not use API data for training (refer to their respective data processing agreements)

---

## 10. Technical Reference

| File | Role |
|------|------|
| `server/analyticsRoutes.ts` | Route handler, `buildAIPrompt()`, AI call wrappers |
| `client/src/pages/analytics.tsx` | Client-side report HTML rendering, PDF generation |
| `shared/schema.ts` | Database schema (API key fields in `organizations` table) |

### Key Functions

- **`buildAIPrompt(report)`** — Constructs the sanitized, anonymized prompt from pre-computed report data
- **`callGeminiForReport(prompt, apiKey)`** — Calls Google Gemini with safety settings
- **`callOpenAIForReport(prompt, apiKey)`** — Calls OpenAI GPT with token limits
- **`registerAnalyticsRoutes(app, middlewares)`** — Registers the report endpoint with auth

---

## 11. Copyright & Intellectual Property

> © 2025 Process Sutra — "Voice of Business™" Performance Report Engine.  
> All rights reserved. Patented.  
> This report format, methodology, scoring matrix, and analytical framework are proprietary and protected under applicable intellectual property laws.  
> Unauthorized reproduction, distribution, or reverse-engineering is strictly prohibited.

---

*This document should be reviewed and updated whenever the AI integration or report data model changes.*
