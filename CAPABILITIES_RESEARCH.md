# Process Sutra — Comprehensive Capabilities Research

> **Generated from full codebase analysis** covering `shared/schema.ts`, `server/routes.ts`, `server/storage.ts`, `server/cycleDetector.ts`, `server/tatCalculator.ts`, `server/webhookUtils.ts`, `server/notifications.ts`, `server/quickFormRoutes.ts`, `server/mongo/quickFormClient.ts`, `server/services/googleDriveService.ts`, `server/aiAssistantRoutes.ts`, `server/billingRoutes.ts`, `server/superAdminRoutes.ts`, `server/reportRoutes.ts`, `client/src/components/flow-builder.tsx`, `client/src/components/quick-form-renderer.tsx`, `llm-flow-builder-prompt.txt`, and all documentation files.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Flow Rules / Flow Builder](#2-flow-rules--flow-builder)
3. [Form Templates / Quick Forms](#3-form-templates--quick-forms)
4. [TAT (Turn-Around Time) Engine](#4-tat-turn-around-time-engine)
5. [Task Lifecycle & Management](#5-task-lifecycle--management)
6. [Notification System](#6-notification-system)
7. [Webhook System](#7-webhook-system)
8. [Integration Capabilities](#8-integration-capabilities)
9. [AI Assistant](#9-ai-assistant)
10. [Reporting & Analytics](#10-reporting--analytics)
11. [Role-Based Access & Permissions](#11-role-based-access--permissions)
12. [Billing & Payments](#12-billing--payments)
13. [Data Management & Export](#13-data-management--export)
14. [Security Features](#14-security-features)
15. [Multi-Tenant Architecture](#15-multi-tenant-architecture)
16. [Super Admin Control Panel](#16-super-admin-control-panel)
17. [Device & Session Management](#17-device--session-management)
18. [Complete API Endpoint Inventory](#18-complete-api-endpoint-inventory)

---

## 1. Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + TypeScript, Vite, Tailwind CSS, shadcn/ui, react-hook-form + Zod |
| **Backend** | Node.js / Express.js (TypeScript) |
| **PostgreSQL ORM** | Drizzle ORM |
| **Document DB** | MongoDB (Quick Forms) |
| **Authentication** | Firebase Auth (session-based) |
| **File Storage** | Google Drive (per-user OAuth2) |
| **Payment Gateway** | PayU |
| **AI Providers** | Google Gemini, OpenAI (GPT-4o, o3-mini, etc.) |
| **Real-time** | Server-Sent Events (SSE) |
| **Deployment** | Docker, Caddy reverse proxy, PM2 (ecosystem.config.cjs) |

---

## 2. Flow Rules / Flow Builder

### 2.1 Flow Rule Schema

Each rule defines **one state transition**. A complete workflow is a collection of rules forming a directed graph.

| Field | Type | Description |
|-------|------|-------------|
| `system` | string | Workflow name (e.g., "Invoice Approval") |
| `currentTask` | string | Source task ("" = flow START) |
| `status` | string | Completion status that triggers this rule ("" for START) |
| `nextTask` | string | Target task to create |
| `tat` | number | Time allowance (numeric value) |
| `tatType` | enum | `daytat` \| `hourtat` \| `beforetat` \| `specifytat` |
| `doer` | string | Role/title of person responsible |
| `email` | string | Assignee email |
| `formId` | string | Attached form template ID (empty = no form) |
| `transferable` | boolean | Whether task can be reassigned |
| `transferToEmails` | string | Comma-separated emails eligible for transfer |
| `mergeCondition` | enum | `all` (wait for all branches) \| `any` (first branch wins) |
| `organizationId` | string | Tenant isolation |

### 2.2 Flow Design Patterns

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| **Sequential** | Linear A → B → C | Each rule's nextTask is the next rule's currentTask |
| **Decision Box (Branching)** | One task → multiple paths based on status | Multiple rules with same `currentTask`, different `status` values |
| **Parallel Fork** | One task → multiple simultaneous tasks | Multiple rules with same `currentTask` + same `status`, different `nextTask` |
| **Merge/Join** | Multiple branches → one task | Multiple rules pointing to same `nextTask` with `mergeCondition` |
| **Loop/Revision Cycle** | Iterative review | Rule pointing back to a previous task (e.g., Review → Revision → Review) |
| **Escalation Ladder** | L1 → L2 → L3 | Cascading rules with "escalated" status |

### 2.3 Status Values (Unlimited Custom Strings)

Statuses are **free-form strings** — any value is valid. Recommended patterns from the AI prompt:

- **Approval flows**: `approved`, `rejected`, `needs_revision`, `escalated`, `deferred`
- **Quality flows**: `passed`, `failed`, `conditional_pass`, `requires_rework`
- **Operations**: `completed`, `on_hold`, `cancelled`, `partially_done`
- **Customer flows**: `accepted`, `declined`, `counter_offered`, `pending_info`
- **Compliance**: `compliant`, `non_compliant`, `requires_clarification`

### 2.4 Merge Conditions

| Value | Behavior |
|-------|----------|
| `all` | Wait for ALL prerequisite branches to complete before creating the merged task |
| `any` | Create the merged task as soon as ANY single branch completes |

### 2.5 Cycle Detection

- **Algorithm**: DFS-based graph traversal (`server/cycleDetector.ts`)
- **Graph key**: `"taskName:status"` adjacency list
- **Detection**: Self-references, two-step cycles, multi-step cycles
- **Behavior**: Warns but **allows** cycles (enables intentional loops)
- **Returns**: `hasCycle`, cycle path array, human-readable message

### 2.6 Flow Lifecycle Operations

| Operation | Endpoint | Behavior |
|-----------|----------|----------|
| **Start Flow** | `POST /api/flows/start` | Creates first task from START rule (currentTask="" status="") |
| **Stop Flow** | `POST /api/flows/:flowId/stop` | Cancels all pending tasks in the flow |
| **Resume Flow** | `POST /api/flows/:flowId/resume` | Reactivates cancelled tasks |
| **External Start** | `POST /api/integrations/start-flow` | API-key authenticated, supports initial form data |
| **Bulk Rules** | `POST /api/flow-rules/bulk` | Up to 100 rules per request |

### 2.7 Flow Builder Visualization (Client)

- **Node types**: `start` (green) | `task` (blue/yellow/green by status) | `end` (gray)
- **SVG-based** rendering with arrow connections
- **Click-to-select** node details panel
- **Circular dependency display** with RefreshCw icon and repeat count

---

## 3. Form Templates / Quick Forms

### 3.1 Field Types

| Type | Description | Options/Config |
|------|-------------|---------------|
| `text` | Single-line text input | `placeholder` |
| `textarea` | Multi-line text input | `placeholder` |
| `number` | Numeric input | `placeholder` |
| `date` | Date picker | — |
| `select` | Dropdown select | `options[]` |
| `radio` | Radio button group | `options[]` |
| `checkbox` | Checkbox group | `options[]` |
| `file` | File upload (Google Drive) | 10MB limit, auto-creates ProcessSutra Files folder |
| `table` | Dynamic table with add/remove rows | `tableColumns[]` |

### 3.2 Table Column Sub-Types

| Column Type | Description |
|-------------|-------------|
| `text` | Text cell |
| `number` | Numeric cell |
| `date` | Date picker cell |
| `select` | Dropdown cell (with `options[]`) |

### 3.3 Form Template Schema (MongoDB)

```
{
  orgId: string,
  formId: string,         // Unique kebab-case ID
  title: string,
  description: string,
  fields: QuickFormField[],
  whatsappConfig: { enabled, recipientField, messageTemplate },
  emailConfig: { enabled, recipientField, subjectTemplate, bodyTemplate },
  createdBy: string
}
```

### 3.4 Form Validation

- **Zod-based** schema generation from field definitions (client-side)
- **Unique field labels** enforced within each form
- **Required field validation** on submission
- **Rate limited**: 20 submissions per minute per user

### 3.5 Post-Submit Communication

| Channel | Mechanism | Features |
|---------|-----------|----------|
| **WhatsApp** | `wa.me` URL with pre-filled message | `{{placeholder}}` template variables |
| **Email** | `mailto:` URL with subject + body | `{{placeholder}}` template variables |

### 3.6 Form Data Features

- **Auto-prefill**: Previous form responses from same flow are fetched and used as initial data
- **Readonly mode**: Forms can be rendered in read-only state
- **Flow/Task binding**: Responses linked to flowId + taskId for traceability

---

## 4. TAT (Turn-Around Time) Engine

### 4.1 TAT Types

| Type | Code | Behavior |
|------|------|----------|
| **Day TAT** | `daytat` | Adds X **working days** (skips configured weekend days) |
| **Hour TAT** | `hourtat` | Adds X **working hours** (skips weekends + non-office hours) |
| **Before TAT** | `beforetat` | Subtracts X working days (deadline = X days *before*) |
| **Specify TAT** | `specifytat` | Sets deadline to specific hour (0–23) on next working day |

### 4.2 TAT Configuration (Per Organization)

| Setting | Default | Description |
|---------|---------|-------------|
| `officeStartHour` | 9 | Office start (24h format) |
| `officeEndHour` | 17 | Office end (24h format) |
| `timezone` | `Asia/Kolkata` | IANA timezone |
| `skipWeekends` | true | Skip weekend days |
| `weekendDays` | `"0,6"` | Comma-separated day numbers (0=Sun, 6=Sat) |

### 4.3 TAT Constraints

- Max 365 days
- End hour must be > start hour
- Minimum 1-hour office window
- IST date formatting helper

---

## 5. Task Lifecycle & Management

### 5.1 Task Statuses

| Status | Description |
|--------|-------------|
| `pending` | Created, awaiting action |
| `in_progress` | Work started |
| `completed` | Finished (triggers next rules) |
| `overdue` | Past planned deadline |
| `cancelled` | Stopped (via flow stop or manual) |

### 5.2 Task Completion Flow

1. Validate form submission (if formId attached)
2. Save form response to MongoDB
3. Find matching next flow rules (`currentTask` + `status`)
4. For each next rule:
   - Check parallel prerequisites (`mergeCondition`)
   - If `all`: verify all prerequisite branches completed
   - If `any`: proceed immediately
5. Create next task(s) with TAT-calculated deadline (in DB transaction)
6. Fire webhooks: `task.completed`, `task.assigned`
7. Send SSE notifications to assignees

### 5.3 Task Transfer

- Enabled per-rule via `transferable: true`
- Restricted to emails in `transferToEmails`
- Tracks: `originalAssignee`, `transferredBy`, `transferredAt`, `transferReason`

### 5.4 Task Cancellation Tracking

- `cancelledBy`, `cancelledAt`, `cancelledReason`
- Flow stop cancels all pending tasks
- Flow resume reactivates cancelled tasks

---

## 6. Notification System

### 6.1 Delivery Mechanism

- **Server-Sent Events (SSE)** via `GET /api/notifications/stream`
- Heartbeat every 25 seconds
- Client connection management (add/remove by email)

### 6.2 Notification Types

| Type | Icon Color |
|------|-----------|
| `info` | Blue |
| `success` | Green |
| `warning` | Yellow |
| `error` | Red |

### 6.3 Notification Events

| Event | Trigger |
|-------|---------|
| `flow-started` | New flow initiated |
| `task-assigned` | Task created/assigned to user |
| `task-cancelled` | Task cancelled |
| `task-resumed` | Task reactivated |

### 6.4 Delivery Methods

| Method | Scope |
|--------|-------|
| `sendToEmail` | Target specific user by email |
| `sendToOrganization` | Broadcast to all connected org users |
| `sendBroadcast` | Broadcast to all connected clients |

---

## 7. Webhook System

### 7.1 Supported Events

| Event | Trigger |
|-------|---------|
| `flow.started` | New flow initiated |
| `flow.completed` | All flow tasks completed |
| `flow.stopped` | Flow manually stopped |
| `flow.resumed` | Flow resumed after stop |
| `flow.cancelled` | Flow cancelled |
| `task.completed` | Individual task completed |
| `task.assigned` | Task assigned to user |
| `form.submitted` | Form response submitted |

### 7.2 Security

- **HMAC-SHA256** signatures on all payloads (secret per webhook)
- **SSRF Protection**: Blocks private IPs, metadata services (169.254.x.x), loopback, carrier-grade NAT, multicast, IPv6 private, internal hostnames
- **Redirect blocking**: No automatic redirect following
- **10-second timeout** per delivery
- **10KB max response** size

### 7.3 Retry Logic

| Attempt | Delay |
|---------|-------|
| 1st retry | 1 minute |
| 2nd retry | 5 minutes |
| 3rd retry | 30 minutes |

- Exponential backoff
- Max 3 retries
- All deliveries logged to `webhookDeliveryLog` table
- Failed deliveries queued in `webhookRetryQueue` table

### 7.4 Webhook Testing

- `POST /api/webhooks/test` sends sample payload to verify endpoint
- Delivery log inspection: `GET /api/webhooks/:id/deliveries`

---

## 8. Integration Capabilities

### 8.1 Google Drive

| Feature | Details |
|---------|---------|
| File Upload | Via form file fields, max 10MB |
| File Download | By fileId |
| File Delete | By fileId |
| File List | Filter by orgId, formId, taskId |
| Auto-folder | Creates "ProcessSutra Files" folder automatically |
| OAuth2 | Per-user tokens (googleAccessToken, googleRefreshToken) |

### 8.2 External API (Start Flow)

| Endpoint | Auth | Features |
|----------|------|----------|
| `POST /api/integrations/start-flow` | API Key (HMAC) | system, orderNumber, description, initialFormData, doerEmail |
| `POST /api/start-flow` | API Key (HMAC) | Same (alias endpoint) |

### 8.3 API Key Management

- CRUD: `POST/GET/PUT/DELETE /api/admin/integrations/keys`
- Fields: `name`, `keyHash` (SHA-256), `keyPrefix`, `scopes` (default: `['flow:start']`), `expiresAt`
- Organization-scoped

### 8.4 PayU Payment Gateway

- Challan-based payment initiation
- Success/Failure redirect callbacks
- Server-to-server webhook with hash verification
- Payment transaction tracking

---

## 9. AI Assistant

### 9.1 Supported Providers & Models

**Gemini Models:**
| Model | Max Tokens |
|-------|-----------|
| `gemini-2.0-flash` (default) | 8,192 |
| `gemini-2.0-flash-lite` | 8,192 |
| `gemini-1.5-flash` | 8,192 |
| `gemini-1.5-pro` | 8,192 |
| `gemini-2.5-flash-preview-05-20` | 65,536 |
| `gemini-2.5-pro-preview-05-06` | 65,536 |

**OpenAI Models:**
| Model | Max Tokens |
|-------|-----------|
| `gpt-4o` | 16,384 |
| `gpt-4o-mini` | 16,384 |
| `gpt-4-turbo` | 4,096 |
| `gpt-3.5-turbo` | 4,096 |
| `o3-mini` | 65,536 |

### 9.2 AI Capabilities

- **6-Phase Conversation Flow**:
  1. Business Intelligence Gathering (industry, model, team structure)
  2. Platform Schema Teaching (flow rules + forms)
  3. Advanced Flow Design (decision boxes, parallel, merge, loops, escalation)
  4. Business-Type Form Intelligence (B2B/B2C/B2G + 10 industry verticals)
  5. Modify Existing Workflow Mode
  6. Report Builder Intelligence

- **Context Injection**: Existing flows, forms, users, organization info sent with each request
- **Output Formats** (UI auto-parsed):
  - `json:flowrules` — deployable flow rule sets
  - `json:forms` — deployable form templates
  - `json:simulation` — flow walkthrough with timing + bottlenecks
  - `json:report` — Power-BI-style report configurations

- **Industry-Specific Field Suggestions**: Manufacturing, Healthcare, Finance, HR, Sales/CRM, Logistics, Legal, Real Estate, IT/Software, Education

### 9.3 AI API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/ai-assistant/status` | Check configured API keys |
| `PUT /api/ai-assistant/api-key` | Save API key (gemini/openai) |
| `DELETE /api/ai-assistant/api-key` | Remove API key |
| `POST /api/ai-assistant/chat` | Send message with context (30 req/min) |
| `GET /api/ai-assistant/models` | List available models filtered by configured keys |

---

## 10. Reporting & Analytics

### 10.1 Power-BI-Style Report Builder (`reportRoutes.ts`)

**Query Engine** over MongoDB form responses:

| Feature | Details |
|---------|---------|
| **Data Sources** | `GET /collections` — lists form templates as queryable data sources |
| **Schema Discovery** | `GET /schema/:formId` — field names, types, sample values |
| **Query Execution** | `POST /query` with filters, columns, groupBy, aggregation, sort, pagination, dateRange |
| **Quick Summary** | `POST /summary` — totalResponses, recentResponses, uniqueSubmitters, dailySubmissions |
| **Saved Reports** | Full CRUD for saved report configurations |

### 10.2 Filter Operators

| Operator | Description |
|----------|-------------|
| `eq` | Equals |
| `ne` | Not equals |
| `gt` | Greater than |
| `gte` | Greater than or equal |
| `lt` | Less than |
| `lte` | Less than or equal |
| `contains` | String contains |
| `notContains` | String does not contain |
| `in` | In array |
| `exists` | Field exists |

### 10.3 Aggregation Operations

| Operation | Description |
|-----------|-------------|
| `count` | Count of records |
| `sum` | Sum of numeric field |
| `avg` | Average of numeric field |
| `min` | Minimum value |
| `max` | Maximum value |

### 10.4 Chart Types

`bar` | `pie` | `line` | `area`

### 10.5 Built-in Analytics Endpoints

| Endpoint | Scope | Data |
|----------|-------|------|
| `GET /api/analytics/metrics` | Admin: org, User: personal | totalTasks, completedTasks, overdueTasks, onTimeRate, avgResolutionTime |
| `GET /api/analytics/flow-performance` | Admin: org, User: personal | Per-system avgCompletionTime, onTimeRate |
| `GET /api/analytics/weekly-scoring` | User-specific | 12-week weekly task scoring |
| `GET /api/analytics/overview` | Combined | Aggregates metrics + flowPerformance + weeklyScoring + systems |
| `GET /api/analytics/report` | Org-scoped | Filtered report with metrics + timeseries |
| `GET /api/analytics/report/systems` | Org-scoped | List of workflow systems |
| `GET /api/analytics/report/processes` | Org-scoped | List of task names per system |
| `GET /api/analytics/doers-performance` | Admin only | Per-doer performance with date/name/email filters |
| `GET /api/analytics/doer-weekly/:email` | Admin only | Doer's weekly breakdown (configurable weeks) |

### 10.6 Business Status Matrix — Analytics Dashboard

Use the **Completion Rate** (Productivity) and **On-Time Rate** (Efficiency) from the analytics dashboard to instantly diagnose your business health:

| Productivity (Completion Rate) | Efficiency (On-Time Rate) | Business Status           | Situation Meaning                                        | Action Plan                                                              |
| ------------------------------ | ------------------------- | ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| High (80–100%)                 | High (80–100%)            | 🚀 Growth Ready           | टीम काम पूरा भी कर रही है और समय पर भी कर रही है         | आक्रामक ग्रोथ, नया बिजनेस लें, मार्केटिंग बढ़ाएँ, ऑटोमेशन में निवेश करें |
| High (80–100%)                 | Low (<70%)                | ⚠ Overloaded System       | काम पूरा हो रहा है लेकिन देरी से – टीम पर लोड ज्यादा है  | स्टाफ बढ़ाएँ, वर्कलोड बैलेंस करें, TAT रिव्यू करें                       |
| Medium (50–80%)                | High (80–100%)            | 📉 Underutilized Capacity | टीम समय पर काम कर सकती है लेकिन टास्क कम पूरे हो रहे हैं | अधिक काम लाएँ, सेल्स बढ़ाएँ, टास्क फ्लो ऑडिट करें                        |
| Medium (50–80%)                | Medium (50–80%)           | 😐 Stable but Slow        | सिस्टम चल रहा है पर तेज नहीं है                          | SOP सुधारें, मॉनिटरिंग बढ़ाएँ, माइक्रो-ट्रेनिंग दें                      |
| Low (<50%)                     | High (80–100%)            | 🧭 Misaligned Execution   | लोग समय पर रिपोर्ट कर रहे हैं पर आउटपुट कम है            | KPI री-डिफाइन करें, आउटपुट-आधारित ट्रैकिंग करें                          |
| Low (<50%)                     | Low (<50%)                | 🔥 Critical Condition     | काम भी पूरा नहीं हो रहा और समय भी खराब                   | तुरंत सिस्टम ऑडिट, जिम्मेदारी तय करें, सख्त फॉलोअप, रीस्ट्रक्चरिंग       |

> **How to read this:** Check your **Completion Rate** (left column) and **On-Time Rate** (second column) from the Analytics Dashboard → the intersection tells you your **Business Status**, what it **means**, and what **action** to take.

### 10.7 Usage Statistics

| Endpoint | Data |
|----------|------|
| `GET /api/usage/summary` | flows, forms, storage, users, cost, performance, quotas |
| `GET /api/usage/trends` | 30-day daily breakdown, flows by system, top forms |

Both support caching with `?nocache=1` bypass.

---

## 11. Role-Based Access & Permissions

### 11.1 Role Hierarchy

| Role | Level | Scope |
|------|-------|-------|
| **Super Admin** | System-wide | Cross-organization management |
| **Admin** | Organization | Full org management |
| **User** | Personal | Own tasks + limited views |

### 11.2 Permission Matrix

| Capability | User | Admin | Super Admin |
|-----------|------|-------|-------------|
| View own tasks | ✅ | ✅ | ✅ |
| View org tasks | ❌ | ✅ | ✅ |
| Create/edit flow rules | ❌ | ✅ | ✅ |
| Create/edit form templates | ❌ | ✅ | ✅ |
| Submit forms | ✅ | ✅ | ✅ |
| Complete tasks | ✅ | ✅ | ✅ |
| Start flows | ✅ | ✅ | ✅ |
| Manage users | ❌ | ✅ | ✅ |
| View analytics (personal) | ✅ | ✅ | ✅ |
| View analytics (org-wide) | ❌ | ✅ | ✅ |
| Export data | ❌ | ✅ | ✅ |
| Delete data | ❌ | ✅ | ✅ |
| Manage webhooks | ❌ | ✅ | ✅ |
| Manage API keys | ❌ | ✅ | ✅ |
| Configure TAT | ❌ | ✅ | ✅ |
| Update org settings | ❌ | ✅ | ✅ |
| Manage AI keys | ❌ | ✅ | ✅ |
| Trust/untrust devices | ❌ | ✅ | ✅ |
| View billing/challans | ❌ | ✅ | ✅ |
| Cross-org management | ❌ | ❌ | ✅ |
| Suspend organizations | ❌ | ❌ | ✅ |
| System statistics | ❌ | ❌ | ✅ |
| Health score monitoring | ❌ | ❌ | ✅ |

### 11.3 User Statuses

| Status | Effect |
|--------|--------|
| `active` | Full access |
| `inactive` | Cannot login (soft disable) |
| `suspended` | Cannot login (admin/super-admin action) |

### 11.4 Admin Protections

- Cannot suspend own account
- Cannot delete own account
- Cannot change own role
- Cannot suspend last admin in org
- Cannot delete last admin in org

---

## 12. Billing & Payments

### 12.1 Plan Types

| Plan | Tier |
|------|------|
| `free` | — |
| `pro` | `starter` / `growth` / `enterprise` |
| `enterprise` | `starter` / `growth` / `enterprise` |

### 12.2 Organization Billing Fields

| Field | Description |
|-------|-------------|
| `monthlyPrice` | Base monthly fee (in paise) |
| `billingCycle` | Billing period |
| `maxFlows` | Flow limit |
| `maxUsers` | User limit |
| `maxStorage` | Storage limit (MB) |
| `usageBasedBilling` | Enable overage charges |
| `pricePerFlow` | Cost per additional flow (paise) |
| `pricePerUser` | Cost per additional user (paise) |
| `pricePerGb` | Cost per additional GB (paise) |

### 12.3 Challan (Invoice) System

| Status | Description |
|--------|-------------|
| `generated` | Invoice created |
| `sent` | Sent to customer |
| `paid` | Payment confirmed |
| `overdue` | Past due date |
| `cancelled` | Voided |

- **Due date**: 15 days after billing period end
- **GST**: 18% tax calculated
- **Previous outstanding**: Rolls unpaid amounts into new challans
- **Usage-based calculation**: baseCost + per-unit overage costs

### 12.4 PayU Integration

| Endpoint | Purpose |
|----------|---------|
| `POST /api/billing/pay/:id` | Generate PayU payment form |
| `POST /payu-success` | Success redirect callback |
| `POST /payu-failure` | Failure redirect callback |
| `POST /payu-webhook` | Server-to-server notification (hash-verified) |

---

## 13. Data Management & Export

### 13.1 Export Categories

| Category | Format | Content |
|----------|--------|---------|
| `flows` | CSV/JSON | All tasks grouped by flowId with metrics |
| `forms` | ZIP (multiple CSVs) | Form submissions grouped by formId |
| `tasks` | CSV/JSON | All tasks flat list |
| `files` | ZIP | Form submissions (files remain in Google Drive) |
| `users` | CSV/JSON | User info (sensitive data excluded) |

### 13.2 Export Limits

- Max 50,000 records per export
- 10 exports per 15 minutes (rate limit)
- CSV injection prevention (strips `=`, `+`, `-`, `@`, `\t`, `\r` prefixes)
- Audit logging on all exports

### 13.3 Delete Categories

| Category | Behavior |
|----------|----------|
| `flows` | Deletes all tasks |
| `forms` | Deletes MongoDB form responses |
| `tasks` | Deletes all tasks |
| `files` | Not performed (files in user Google Drives) |
| `users` | Not allowed in bulk |

### 13.4 Super Admin CSV Exports

8 export types: organizations, users, tasks, challans, transactions, audit-logs, login-logs, flow-rules

### 13.5 Flow Data Export

`GET /api/export/flow-data` — Comprehensive export with:
- Task details + form responses per task
- Per-task: cycleTime (hours), tatVariance, isOnTime
- Per-flow: avgCycleTime, completionRate, overallFlowTime, onTimeRate

---

## 14. Security Features

### 14.1 Input Sanitization

- XSS prevention via `inputSanitizer.ts`
- SQL injection prevention (parameterized queries + ILIKE sanitization)
- CSV injection prevention on exports

### 14.2 Rate Limiting

| Limiter | Limit | Window |
|---------|-------|--------|
| `globalLimiter` | 1,000 requests | 15 min |
| `formSubmissionLimiter` | 10 submissions | 1 min |
| `analyticsLimiter` | 30 requests | 1 min |
| `superAdminLimiter` | 100 requests | 15 min |
| `exportLimiter` | 10 requests | 15 min |
| `flowRuleLimiter` | 50 requests | 15 min |
| `bulkFlowRuleLimiter` | 5 requests | 1 hour |
| `aiLimiter` | 30 requests | 1 min |
| Quick Form submission | 20 submissions | 1 min |

### 14.3 Webhook Security

- HMAC-SHA256 payload signatures
- SSRF protection (private IP blocking)
- Redirect blocking
- Timeout enforcement (10s)
- Response size limits (10KB)

### 14.4 Authentication

- Firebase Auth middleware
- Session validation on every request
- Suspended/inactive user blocking at middleware level
- Organization isolation enforcement

### 14.5 Audit Logging

- All sensitive operations logged to `auditLogs` table
- Fields: actorId, actorEmail, action, targetType, targetId, oldValue, newValue, ipAddress, userAgent
- Export/delete operations logged to console with timestamps

---

## 15. Multi-Tenant Architecture

### 15.1 Organization Schema

| Field | Description |
|-------|-------------|
| `name`, `domain`, `subdomain` | Identity |
| `logoUrl`, `primaryColor` | Branding |
| `companyName`, `address`, `phone`, `gstNumber` | Business details |
| `industry` | Industry vertical |
| `customerType` | `B2B` \| `B2C` \| `B2G` |
| `businessType` | `Trading` \| `Manufacturing` \| `Wholesaler` \| `Retailer` \| `Service Provider` |
| `planType` | `free` \| `pro` \| `enterprise` |
| `pricingTier` | `starter` \| `growth` \| `enterprise` |
| `isActive`, `isSuspended` | Status flags |
| `maxUsers`, `maxFlows`, `maxStorage` | Quotas |
| `healthScore`, `healthStatus` | Super admin monitoring |
| `geminiApiKey`, `openaiApiKey` | AI provider keys |

### 15.2 Data Isolation

- Every PostgreSQL table includes `organizationId`
- Every MongoDB collection query filters by `orgId`
- Middleware enforces org-scoping on all data access
- Cross-org access only via Super Admin routes

---

## 16. Super Admin Control Panel

### 16.1 Organization Management

| Operation | Endpoint |
|-----------|----------|
| List all orgs (enriched) | `GET /api/super-admin/organizations` |
| Create org | `POST /api/super-admin/organizations` |
| Update org | `PUT /api/super-admin/organizations/:id` |
| Toggle active status | `PUT /api/super-admin/organizations/:id/status` |
| Suspend/resume | `POST /api/super-admin/organizations/:id/suspend` / `resume` |
| Transfer ownership | `POST /api/super-admin/organizations/:id/transfer-ownership` |
| Delete org (with archival) | `DELETE /api/super-admin/organizations/:id` |
| Full org details | `GET /api/super-admin/organizations/:id/details` |

### 16.2 Health Score Calculation

Based on weighted factors:
- Active users percentage
- Overdue tasks percentage
- Login engagement
- Task completion rate

### 16.3 System Statistics

- Cross-org totals: users, tasks, billing, completion rates
- Per-org breakdown
- Global activity feed (logins + tasks across all orgs)

### 16.4 Cross-Org User Management

- List all users (all orgs or filtered by orgId)
- Change user status across any org
- Promote/demote super admin
- User role changes with audit logging

### 16.5 Billing Overview

- Cross-org revenue summary
- Monthly Recurring Revenue (MRR)
- Per-org billing breakdown
- Challan/transaction listing across orgs
- Challan status updates

---

## 17. Device & Session Management

### 17.1 User Login Logs

- Login time, logout time, session duration
- IP address, location (country/region/city/lat/lng)
- Device type, browser name, OS

### 17.2 Device Tracking

- Device fingerprinting by deviceId
- Device types: desktop, mobile, tablet
- Trust management: admin can trust/untrust devices

### 17.3 Password Change History

- Tracked per user with timestamps
- Organization-scoped

### 17.4 User Activity Detection

- "Online" status: last login within 10 minutes
- Admin view of all active users with location data
- Location map data endpoint

### 17.5 Bulk Operations

- Bulk activate/deactivate users
- Force logout user
- Prevent suspending all admins

---

## 18. Complete API Endpoint Inventory

### Flow Rules
| Method | Path |
|--------|------|
| GET | `/api/flow-rules` |
| POST | `/api/flow-rules` |
| POST | `/api/flow-rules/bulk` |
| PUT | `/api/flow-rules/:id` |
| DELETE | `/api/flow-rules/:id` |

### Tasks
| Method | Path |
|--------|------|
| GET | `/api/tasks` |
| POST | `/api/tasks` |
| PUT | `/api/tasks/:id` |
| PATCH | `/api/tasks/:id/status` |
| POST | `/api/tasks/:id/complete` |
| POST | `/api/tasks/:id/transfer` |

### Flows
| Method | Path |
|--------|------|
| POST | `/api/flows/start` |
| POST | `/api/flows/:flowId/stop` |
| POST | `/api/flows/:flowId/resume` |
| GET | `/api/flows/:flowId/data` |

### Quick Forms
| Method | Path |
|--------|------|
| GET | `/api/quick-forms` |
| POST | `/api/quick-forms` |
| PUT | `/api/quick-forms/:formId` |
| DELETE | `/api/quick-forms/:formId` |
| GET | `/api/quick-forms/responses` |
| GET | `/api/quick-forms/responses/by-task/:taskId` |
| POST | `/api/quick-forms/responses/check-tasks` |
| POST | `/api/quick-forms/responses/:formId/submit` |
| DELETE | `/api/quick-forms/responses/:id` |

### Integration / API Keys
| Method | Path |
|--------|------|
| POST | `/api/integrations/start-flow` |
| POST | `/api/start-flow` |
| POST | `/api/admin/integrations/keys` |
| GET | `/api/admin/integrations/keys` |
| PUT | `/api/admin/integrations/keys/:id` |
| DELETE | `/api/admin/integrations/keys/:id` |

### Webhooks
| Method | Path |
|--------|------|
| GET | `/api/webhooks` |
| POST | `/api/webhooks` |
| PUT | `/api/webhooks/:id` |
| DELETE | `/api/webhooks/:id` |
| POST | `/api/webhooks/test` |
| GET | `/api/webhooks/:id/deliveries` |
| GET | `/api/webhooks-deliveries` |

### Analytics
| Method | Path |
|--------|------|
| GET | `/api/analytics/metrics` |
| GET | `/api/analytics/flow-performance` |
| GET | `/api/analytics/weekly-scoring` |
| GET | `/api/analytics/overview` |
| GET | `/api/analytics/report` |
| GET | `/api/analytics/report/systems` |
| GET | `/api/analytics/report/processes` |
| GET | `/api/analytics/doers-performance` |
| GET | `/api/analytics/doer-weekly/:doerEmail` |

### Report Builder
| Method | Path |
|--------|------|
| GET | `/api/reports/collections` |
| GET | `/api/reports/schema/:formId` |
| POST | `/api/reports/query` |
| POST | `/api/reports/summary` |
| GET | `/api/reports/saved` |
| POST | `/api/reports/saved` |
| PUT | `/api/reports/saved/:id` |
| DELETE | `/api/reports/saved/:id` |

### Usage & Billing
| Method | Path |
|--------|------|
| GET | `/api/usage/summary` |
| GET | `/api/usage/trends` |
| GET | `/api/billing/challans` |
| GET | `/api/billing/challans/:id` |
| POST | `/api/billing/generate` |
| GET | `/api/billing/outstanding` |
| GET | `/api/billing/transactions` |
| POST | `/api/billing/pay/:id` |

### Notifications
| Method | Path |
|--------|------|
| GET | `/api/notifications/stream` (SSE) |

### TAT Configuration
| Method | Path |
|--------|------|
| GET | `/api/tat-config` |
| POST | `/api/tat-config` |

### Users
| Method | Path |
|--------|------|
| GET | `/api/users` |
| POST | `/api/users` |
| PUT | `/api/users/:id` |
| PUT | `/api/users/:id/status` |
| PUT | `/api/users/:id/role` |
| DELETE | `/api/users/:id` |

### Organization
| Method | Path |
|--------|------|
| GET | `/api/organizations/current` |
| POST | `/api/organizations` |
| PUT | `/api/organizations/current` |

### Data Export / Delete
| Method | Path |
|--------|------|
| GET | `/api/export/:category` |
| GET | `/api/export/flow-data` |
| DELETE | `/api/delete/:category` |
| GET | `/api/data-counts` |

### Login & Devices
| Method | Path |
|--------|------|
| GET | `/api/login-logs` |
| POST | `/api/login-logs` |
| GET | `/api/devices` |
| POST | `/api/devices` |
| PUT | `/api/devices/:deviceId/trust` |
| GET | `/api/password-history` |
| POST | `/api/password-history` |

### AI Assistant
| Method | Path |
|--------|------|
| GET | `/api/ai-assistant/status` |
| PUT | `/api/ai-assistant/api-key` |
| DELETE | `/api/ai-assistant/api-key` |
| POST | `/api/ai-assistant/chat` |
| GET | `/api/ai-assistant/models` |

### Google Drive / OAuth
| Method | Path |
|--------|------|
| — | See `oauthRoutes.ts` for Google OAuth flow |
| — | See `googleDriveService.ts` for upload/download/list/delete |

### Super Admin (System-Wide)
| Method | Path |
|--------|------|
| GET | `/api/super-admin/organizations` |
| POST | `/api/super-admin/organizations` |
| PUT | `/api/super-admin/organizations/:id` |
| PUT | `/api/super-admin/organizations/:id/status` |
| POST | `/api/super-admin/organizations/:id/suspend` |
| POST | `/api/super-admin/organizations/:id/resume` |
| POST | `/api/super-admin/organizations/:id/transfer-ownership` |
| DELETE | `/api/super-admin/organizations/:id` |
| GET | `/api/super-admin/organizations/:id/details` |
| GET | `/api/super-admin/all-users` |
| PUT | `/api/super-admin/users/:userId/status` |
| PUT | `/api/super-admin/users/:userId/promote-super-admin` |
| GET | `/api/super-admin/system-statistics` |
| GET | `/api/super-admin/global-activity` |
| GET | `/api/super-admin/billing-summary` |
| GET | `/api/super-admin/challans` |
| GET | `/api/super-admin/transactions` |
| GET | `/api/super-admin/audit-logs` |
| PUT | `/api/super-admin/challans/:id/status` |
| GET | `/api/super-admin/health-scores` |
| GET | `/api/super-admin/export/:type` |

### Super Admin (Organization-Scoped / Dashboard)
| Method | Path |
|--------|------|
| GET | `/api/super-admin/statistics` |
| GET | `/api/super-admin/active-users` |
| GET | `/api/super-admin/user-locations` |
| POST | `/api/super-admin/bulk-status-change` |
| POST | `/api/super-admin/force-logout/:userId` |
| GET | `/api/super-admin/activity-timeline` |

---

## Summary of All Enumerations

### Form Field Types (9)
`text` · `textarea` · `number` · `date` · `select` · `radio` · `checkbox` · `file` · `table`

### Table Column Sub-Types (4)
`text` · `number` · `date` · `select`

### TAT Types (4)
`daytat` · `hourtat` · `beforetat` · `specifytat`

### Task Statuses (5)
`pending` · `in_progress` · `completed` · `overdue` · `cancelled`

### Merge Conditions (2)
`all` · `any`

### User Roles (3)
`user` · `admin` · `superAdmin` (isSuperAdmin flag)

### User Statuses (3)
`active` · `inactive` · `suspended`

### Notification Types (4)
`info` · `success` · `warning` · `error`

### Webhook Events (8)
`flow.started` · `flow.completed` · `flow.stopped` · `flow.resumed` · `flow.cancelled` · `task.completed` · `task.assigned` · `form.submitted`

### Report Filter Operators (10)
`eq` · `ne` · `gt` · `gte` · `lt` · `lte` · `contains` · `notContains` · `in` · `exists`

### Aggregation Operations (5)
`count` · `sum` · `avg` · `min` · `max`

### Chart Types (4)
`bar` · `pie` · `line` · `area`

### Organization Customer Types (3)
`B2B` · `B2C` · `B2G`

### Organization Business Types (5)
`Trading` · `Manufacturing` · `Wholesaler` · `Retailer` · `Service Provider`

### Plan Types (3)
`free` · `pro` · `enterprise`

### Pricing Tiers (3)
`starter` · `growth` · `enterprise`

### Challan Statuses (5)
`generated` · `sent` · `paid` · `overdue` · `cancelled`

### Export Categories (5)
`flows` · `forms` · `tasks` · `files` · `users`

### Super Admin Export Types (8)
`organizations` · `users` · `tasks` · `challans` · `transactions` · `audit-logs` · `login-logs` · `flow-rules`

### Flow Builder Node Types (3)
`start` · `task` · `end`
