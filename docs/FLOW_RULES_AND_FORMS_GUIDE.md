# Process Sutra — Flow Rules & Forms: Complete Capability Guide

> **Everything you need to know about designing Flow Rules, building Forms, and automating business processes with Process Sutra.**

---

## Table of Contents

1. [What Are Flow Rules?](#1-what-are-flow-rules)
2. [Flow Rule Anatomy — Every Field Explained](#2-flow-rule-anatomy--every-field-explained)
3. [Flow Design Patterns](#3-flow-design-patterns)
4. [TAT (Turn Around Time) System](#4-tat-turn-around-time-system)
5. [What Are Forms?](#5-what-are-forms)
6. [Form Field Types — Complete Reference](#6-form-field-types--complete-reference)
7. [Form Communication Add-ons](#7-form-communication-add-ons)
8. [Flow + Form Integration](#8-flow--form-integration)
9. [Task Lifecycle & Statuses](#9-task-lifecycle--statuses)
10. [Visual Flow Builder](#10-visual-flow-builder)
11. [API & Webhook Integration](#11-api--webhook-integration)
12. [Advanced Simulator](#12-advanced-simulator)
13. [Analytics & Reporting](#13-analytics--reporting)
14. [Role-Based Access Control](#14-role-based-access-control)
15. [Real-World Business Use Cases](#15-real-world-business-use-cases)
16. [Quick-Start Checklist](#16-quick-start-checklist)

---

## 1. What Are Flow Rules?

A **Flow Rule** is a single instruction that tells Process Sutra:

> *"When **Task X** finishes with **Status Y**, create **Task Z**, assign it to **Person P**, and give them **N hours/days** to complete it."*

A collection of Flow Rules under the same **System** name forms a complete **Workflow** (also called a "Flow"). When a flow is started, the engine reads the rules one-by-one to determine which tasks to create, who to assign them to, and what deadlines to set.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **System** | A named workflow (e.g., "Purchase Order Approval", "Employee Onboarding") |
| **Flow Instance** | A single execution/run of a system, identified by a unique `flowId` |
| **Flow Rule** | One transition rule: current task + status → next task |
| **Task** | A unit of work created when a rule fires, assigned to a specific person |
| **Start Rule** | A rule where `currentTask` is empty — it fires when the flow begins |
| **Order Number** | An optional business reference (invoice #, ticket #, case #) attached to a flow |

---

## 2. Flow Rule Anatomy — Every Field Explained

Each Flow Rule has the following configurable fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **System** | Text (max 100 chars) | Yes | The workflow name this rule belongs to |
| **Current Task** | Text (max 200 chars) | No | The preceding task name. *Leave blank for the start rule* |
| **Status** | Text (max 100 chars) | No | The completion status of the current task that triggers this rule (e.g., "approved", "rejected", "done") |
| **Next Task** | Text (max 200 chars) | Yes | The task to create when this rule fires |
| **TAT** | Integer | Yes | The Turn Around Time value (interpreted based on TAT Type) |
| **TAT Type** | Enum | Yes | How to calculate the deadline: `daytat`, `hourtat`, `beforetat`, `specifytat` |
| **Doer** | Text (max 100 chars) | Yes | Role/name of the person responsible |
| **Email** | Email | Yes | Email address of the task assignee |
| **Form ID** | Text | No | Attach a form template that the doer must fill before completing the task |
| **Transferable** | Boolean | No | Whether the assignee can transfer this task to someone else |
| **Transfer To Emails** | Text (max 500 chars) | No | Comma-separated list of emails eligible to receive a transfer |
| **Merge Condition** | `all` or `any` | No | For parallel paths — `all` = wait for every parallel branch; `any` = proceed when the first branch completes |

### Start Rule vs. Transition Rule

```
Start Rule:      currentTask = ""    status = ""     → creates the first task
Transition Rule: currentTask = "X"   status = "done" → creates the next task after X is completed with "done"
```

### Example: 3-Step Approval

| # | System | Current Task | Status | Next Task | TAT | TAT Type | Doer | Email |
|---|--------|-------------|--------|-----------|-----|----------|------|-------|
| 1 | Purchase Approval | *(empty)* | *(empty)* | Submit Request | 1 | daytat | Requester | requester@co.com |
| 2 | Purchase Approval | Submit Request | submitted | Manager Review | 2 | daytat | Manager | manager@co.com |
| 3 | Purchase Approval | Manager Review | approved | Finance Processing | 4 | hourtat | Finance | finance@co.com |
| 4 | Purchase Approval | Manager Review | rejected | Revise Request | 1 | daytat | Requester | requester@co.com |

---

## 3. Flow Design Patterns

Process Sutra supports **six powerful design patterns** that can be combined to model any business process.

### 3.1 Sequential (Linear) Flow

The simplest pattern — tasks happen one after another.

```
Start → Task A → Task B → Task C → End
```

**Use When:** Steps must happen in strict order (e.g., document review → approval → dispatch).

### 3.2 Decision / Branching Flow

A task can lead to different next tasks based on its completion **status**.

```
                  ┌─ (approved) → Finance Processing
Manager Review ───┤
                  └─ (rejected) → Revise & Resubmit
```

**How to configure:** Create multiple rules with the **same Current Task** but **different Status** values, each pointing to a different Next Task.

| Current Task | Status | Next Task |
|-------------|--------|-----------|
| Manager Review | approved | Finance Processing |
| Manager Review | rejected | Revise & Resubmit |
| Manager Review | need_info | Request Clarification |

### 3.3 Parallel Fork (Simultaneous Tasks)

One task completion triggers **multiple tasks at the same time**.

```
                    ┌─→ Legal Review
Order Received ─────┼─→ Credit Check
                    └─→ Warehouse Reserve
```

**How to configure:** Create multiple rules with the **same Current Task and Status** but **different Next Tasks**.

| Current Task | Status | Next Task | Doer |
|-------------|--------|-----------|------|
| Order Received | confirmed | Legal Review | Legal Team |
| Order Received | confirmed | Credit Check | Finance Team |
| Order Received | confirmed | Warehouse Reserve | Warehouse Team |

### 3.4 Merge / Join (Wait for Parallel Tasks)

After parallel tasks, wait for branches to complete before continuing.

```
Legal Review ──────┐
Credit Check ──────┼─→ Final Approval
Warehouse Reserve ─┘
```

**How to configure:** Create rules from each parallel task pointing to the **same Next Task**, and set the **Merge Condition**:

- **`all`** — Wait until ALL parallel predecessor tasks are completed (AND logic)
- **`any`** — Proceed as soon as ANY one parallel task completes (OR logic)

| Current Task | Status | Next Task | Merge Condition |
|-------------|--------|-----------|-----------------|
| Legal Review | done | Final Approval | all |
| Credit Check | done | Final Approval | all |
| Warehouse Reserve | done | Final Approval | all |

### 3.5 Loop / Revision Cycle

A task can route back to a previous task, creating a revision loop.

```
Submit Draft → Review → (revision_needed) → Submit Draft → Review → (approved) → Publish
```

**How to configure:** Point the Next Task back to an earlier task name.

| Current Task | Status | Next Task |
|-------------|--------|-----------|
| Review | revision_needed | Submit Draft |
| Review | approved | Publish |

### 3.6 Escalation Path

Route overdue or special-case tasks to senior personnel.

```
Support Agent → (escalated) → Senior Agent → (resolved) → Close Ticket
```

**Tip:** Combine with TAT deadlines — if a task isn't completed within its TAT, the assignee can mark it as "escalated" to trigger routing to a supervisor.

### 3.7 Combining Patterns

Real workflows combine multiple patterns. Here's a complex example:

```
┌─────────────────────────────────────────────────────────────────┐
│  Start                                                          │
│    └─→ Submit Application                                       │
│           └─→ (submitted)                                       │
│                 ├─→ Document Verification (Ops Team)            │
│                 └─→ Background Check (HR Team)        [PARALLEL]│
│                       ├─→ (all done) → Manager Approval         │
│                       │      ├─→ (approved) → Onboard Employee  │
│                       │      └─→ (rejected) → Notify Candidate  │
│                       └─→ (flagged) → Escalate to Director      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. TAT (Turn Around Time) System

Every task has a deadline calculated from its creation time using the TAT configuration.

### 4.1 TAT Types

| TAT Type | Value Meaning | Example | Deadline Calculation |
|----------|--------------|---------|---------------------|
| **`daytat`** | Number of business days | `tat: 2` | 2 working days from task creation, skipping weekends and non-office hours |
| **`hourtat`** | Number of business hours | `tat: 4` | 4 office hours from task creation (pauses outside office hours) |
| **`beforetat`** | Complete before this hour (24h) | `tat: 14` | Must be done by 2:00 PM today (or next business day if already past) |
| **`specifytat`** | Must complete by this hour daily | `tat: 17` | Deadline is 5:00 PM on the task creation day |

### 4.2 Organization TAT Configuration

Each organization can customize:

| Setting | Default | Description |
|---------|---------|-------------|
| **Office Start Hour** | 9 (9:00 AM) | When the work day begins |
| **Office End Hour** | 17 (5:00 PM) | When the work day ends |
| **Timezone** | Asia/Kolkata | Organization's timezone |
| **Skip Weekends** | Yes | Whether to exclude weekends from TAT calculations |
| **Weekend Days** | Saturday, Sunday | Configurable — any combination of days can be weekends |

### 4.3 How TAT Calculation Works

1. Task is created at time `T`
2. System reads the organization's TAT config (office hours, weekends, timezone)
3. Based on TAT Type:
   - **daytat**: Adds N × (office hours per day), skipping weekends
   - **hourtat**: Adds N hours of office time, pausing outside office hours
   - **beforetat**: Sets deadline to the specified hour on the current or next business day
   - **specifytat**: Sets deadline to the specified hour on the creation day
4. The resulting **Planned Time** is stored on the task
5. Tasks exceeding their Planned Time are flagged as **overdue**

### 4.4 Business Impact

- **SLA Compliance**: Automatically track if your team meets service agreements
- **Performance Scoring**: Weekly scoring based on on-time completion rates
- **Overdue Alerts**: Real-time notifications when tasks risk missing deadlines
- **Realistic Deadlines**: Respects actual working hours, not calendar hours

---

## 5. What Are Forms?

A **Form Template** is a reusable data collection structure that can be attached to any flow step. When a user needs to complete a task that has a form attached, they must fill in the form before marking the task as done.

Forms are stored in **MongoDB** for flexible schema support and are linked to flow tasks via their `formId`.

### Form Capabilities

- Unlimited questions per form
- Mix and match field types
- Required/optional field validation
- Drag-and-drop question reordering
- Preview before publishing
- Duplicate existing forms
- Attach to multiple flow steps
- Auto-prefill from previous step data
- Post-submission email/WhatsApp communication
- File uploads with Google Drive integration
- Table fields for multi-row data entry

---

## 6. Form Field Types — Complete Reference

### 6.1 Text Input

| Property | Value |
|----------|-------|
| **Type** | `text` |
| **Use For** | Names, titles, short answers, IDs, codes |
| **Features** | Custom placeholder text, required validation |
| **Example** | Employee Name, Invoice Number, City |

### 6.2 Textarea (Multi-line Text)

| Property | Value |
|----------|-------|
| **Type** | `textarea` |
| **Use For** | Descriptions, comments, addresses, detailed notes |
| **Features** | Multi-line input, custom placeholder |
| **Example** | Reason for leave, Feedback comments, Delivery address |

### 6.3 Number

| Property | Value |
|----------|-------|
| **Type** | `number` |
| **Use For** | Quantities, amounts, measurements, scores |
| **Features** | Numeric-only input, required validation |
| **Example** | Quantity ordered, Total amount, Temperature reading |

### 6.4 Date Picker

| Property | Value |
|----------|-------|
| **Type** | `date` |
| **Use For** | Dates, deadlines, DOBs, scheduled events |
| **Features** | Calendar popup, date format validation |
| **Example** | Start date, Delivery date, Date of incident |

### 6.5 Dropdown (Select)

| Property | Value |
|----------|-------|
| **Type** | `select` |
| **Use For** | Choosing one option from a predefined list |
| **Features** | Customizable option list, placeholder text, required validation |
| **Example** | Department, Priority level, Product category |

### 6.6 Radio Buttons

| Property | Value |
|----------|-------|
| **Type** | `radio` |
| **Use For** | Single selection from visible options |
| **Features** | All options visible at once, custom option labels |
| **Example** | Yes/No, Approve/Reject/Hold, Severity (Low/Medium/High) |

### 6.7 Checkbox (Multiple Selection)

| Property | Value |
|----------|-------|
| **Type** | `checkbox` |
| **Use For** | Multiple selections from a list |
| **Features** | Multiple choices allowed, custom option labels |
| **Example** | Services requested, Skills checklist, Compliance items checked |

### 6.8 File Upload

| Property | Value |
|----------|-------|
| **Type** | `file` |
| **Use For** | Uploading documents, images, certificates, invoices |
| **Features** | Google Drive integration, multiple file support, stored securely |
| **Example** | Medical certificate, Purchase invoice, ID proof, Photos |

### 6.9 Table / Multiple Items

| Property | Value |
|----------|-------|
| **Type** | `table` |
| **Use For** | Repeating data with multiple columns (line items, inventories, attendees) |
| **Features** | Dynamic row addition/removal, configurable columns |
| **Column Types** | `text`, `number`, `date`, `select` |
| **Example** | Invoice line items, Attendee list, Material requisition list |

**Table Column Configuration:**

Each table column supports:
- **Column Name** — Header label
- **Column Type** — `text`, `number`, `date`, or `select`
- **Options** — For `select` type columns, define dropdown choices

**Example Table: Purchase Order Line Items**

| Item Name (text) | Quantity (number) | Unit Price (number) | Delivery Date (date) | Category (select) |
|-------------------|-------------------|---------------------|-----------------------|-------------------|
| Office Chairs | 10 | 5000 | 2026-03-15 | Furniture |
| Laptops | 5 | 65000 | 2026-03-20 | Electronics |

---

## 7. Form Communication Add-ons

Forms can automatically send notifications when submitted.

### 7.1 Email Notification

| Setting | Description |
|---------|-------------|
| **Enable/Disable** | Toggle email sending per form |
| **To Email** | Recipient email address (supports template variables) |
| **Subject** | Email subject line (supports template variables) |
| **Body** | Email body content (supports template variables, HTML) |

### 7.2 WhatsApp Notification

| Setting | Description |
|---------|-------------|
| **Enable/Disable** | Toggle WhatsApp sending per form |
| **Phone Number** | Recipient phone (supports template variables) |
| **Message** | Message content (supports template variables) |

### 7.3 Template Variables

Use these placeholders in email/WhatsApp templates — they are auto-replaced at send time:

| Variable | Resolves To |
|----------|-------------|
| `{{response_id}}` | Unique form response ID |
| `{{task_name}}` | Name of the task |
| `{{submitter_email}}` | Email of the person who submitted the form |
| `{{submitted_at}}` | Timestamp of submission |
| `{{flow_id}}` | Flow instance ID |
| `{{order_number}}` | Business order/case number |
| `{{system}}` | Workflow system name |
| `{{field_<fieldName>}}` | Value of any specific form field |

### 7.4 Example Email Template

```
Subject: New {{system}} Submission — Order #{{order_number}}

Dear Team,

A new form has been submitted for task "{{task_name}}" in the {{system}} workflow.

Submitted by: {{submitter_email}}
Date: {{submitted_at}}
Order Number: {{order_number}}

Please review and take necessary action.

Regards,
Process Sutra
```

---

## 8. Flow + Form Integration

### How Forms Work Inside Flows

1. **Admin creates** a Form Template in the Form Builder
2. **Admin attaches** the form to a flow rule via the `formId` field
3. When a **task is created** from that rule, it carries the `formId`
4. The **assigned user** sees the form embedded in their task
5. User **fills the form** and submits → form data is stored in MongoDB
6. Task is **marked complete** with the chosen status
7. Flow engine **fires the next rule** based on the status
8. Form data from the **first step** is visible to all subsequent tasks in the flow (`flowInitialFormData`)

### Form Data Flow

```
Task A (with Form 1)
  └─→ User fills Form 1 → data saved
        └─→ Task B (with Form 2) sees Form 1 data as context
              └─→ User fills Form 2 → data saved
                    └─→ Task C can see Form 1 + Form 2 data
```

### Best Practices

- **First form** should capture all essential info (customer details, order info) — this becomes `flowInitialFormData` visible to everyone
- **Subsequent forms** should capture stage-specific data (approval remarks, inspection results)
- Use **file upload** fields for documents needed at approval stages
- Use **table fields** for line items in procurement/invoice workflows

---

## 9. Task Lifecycle & Statuses

### 9.1 Task Statuses

| Status | Description | Color |
|--------|-------------|-------|
| **pending** | Task created, waiting for assignee to act | Yellow |
| **in_progress** | Assignee has started working on it | Blue |
| **completed** | Task finished successfully | Green |
| **overdue** | Task exceeded its TAT deadline | Red |
| **cancelled** | Task was manually cancelled | Gray |

### 9.2 Task Transfer

When a task has `transferable: true`:

- The current assignee can transfer it to another user
- Transfer is restricted to emails listed in `transferToEmails`
- A **transfer reason** is recorded for audit
- Original assignee is tracked in `originalAssignee`
- Transfer timestamp and who transferred are logged

### 9.3 Task Cancellation

- Authorized users can cancel pending/in-progress tasks
- Cancellation records: who cancelled, when, and why
- Cancelled tasks do not trigger downstream flow rules

### 9.4 Flow Context on Every Task

Every task carries rich context:

| Field | Description |
|-------|-------------|
| `flowInitiatedBy` | WHO started the flow |
| `flowInitiatedAt` | WHEN the flow was started |
| `flowDescription` | WHAT/WHY — purpose of this flow run |
| `flowInitialFormData` | First form's data, visible to all tasks |
| `orderNumber` | Business reference number |

---

## 10. Visual Flow Builder

The Visual Flow Builder provides a **drag-and-drop graphical interface** to design and manage workflows.

### Capabilities

| Feature | Description |
|---------|-------------|
| **Node Types** | Start (blue), Task (green), Decision (yellow), End (red) |
| **Drag & Drop** | Rearrange nodes visually |
| **Zoom Controls** | Zoom in/out for complex workflows |
| **Edge Labels** | See transition statuses on connecting lines |
| **System Filter** | View one workflow system at a time |
| **Inline Editing** | Click any node to edit its rule properties |
| **Add Rules** | Create new rules directly in the visual interface |
| **Delete Rules** | Remove rules with visual confirmation |
| **Real-time Sync** | Changes reflect immediately |
| **SVG Export** | Export flow diagrams as images |

### Color Coding

| Node Type | Color | Meaning |
|-----------|-------|---------|
| Start | Blue | Entry point of the workflow |
| Task | Green | A work step assigned to someone |
| Decision | Yellow | A branching point with multiple outcomes |
| End | Red | Terminal state of the workflow |
| Completed | Gray | Already-finished steps |

---

## 11. API & Webhook Integration

### 11.1 Start Flow via API

Trigger workflows programmatically from external systems (CRM, ERP, website, mobile app).

**Endpoint:** `POST /api/external/start-flow`

**Authentication:** Two headers required:
- `X-Organization-Id` — Your organization ID
- `X-API-Key` — A valid API key

**Request Body:**
```json
{
  "system": "Purchase Approval",
  "orderNumber": "PO-2026-001",
  "description": "New purchase request from vendor XYZ",
  "notifyAssignee": true,
  "initialFormData": {
    "vendor_name": "XYZ Corp",
    "amount": 50000,
    "category": "IT Equipment"
  }
}
```

**Security Features:**
- HMAC-authenticated requests
- API key hashing (keys stored as hashes, not plaintext)
- Rate limiting
- SSRF protection on webhook URLs
- Key expiration support
- Scope-based permissions (`flow:start`)

### 11.2 Webhooks (Outbound Events)

Subscribe to events and receive real-time HTTP callbacks.

**Available Events:**

| Event | Fires When |
|-------|------------|
| `flow.started` | A new flow instance begins |
| `flow.completed` | All tasks in a flow are done |
| `flow.cancelled` | A flow is cancelled |
| `task.assigned` | A new task is created and assigned |
| `task.completed` | A task is marked complete |
| `task.overdue` | A task exceeds its TAT |
| `form.submitted` | A form response is submitted |
| `task.transferred` | A task is transferred to another user |

**Webhook Security:**
- HMAC-SHA256 signature on every payload
- Configurable secret per webhook
- Automatic retry with exponential backoff (up to 3 retries)
- Delivery logs with HTTP status, latency, and error tracking
- SSRF protection (blocks internal IPs and private networks)

### 11.3 API Key Management

- Create multiple API keys with names and descriptions
- View usage (last used timestamp)
- Revoke/delete keys instantly
- Keys displayed with prefix for identification (e.g., `ps_live_...`)

---

## 12. Advanced Simulator

Test your workflows before going live with realistic simulations.

### Simulation Capabilities

| Feature | Description |
|---------|-------------|
| **Instance Count** | Simulate 1 to hundreds of flow instances |
| **Speed Control** | Adjust simulation speed (minutes per tick) |
| **Team Size** | Auto-calculated from your flow rules |
| **Cost Analysis** | Set cost per hour to calculate ROI |
| **Peak Hours** | Define busy periods with speed boosts |
| **Working Hours** | Respect office hours and weekends |
| **Fast Mode** | Quick simulation for rapid testing |

### Arrival Patterns

| Pattern | Behavior |
|---------|----------|
| **None** | No new arrivals during simulation |
| **Period** | Regular intervals between new flows |
| **Uniform** | Random within min-max range |
| **Normal Distribution** | Statistical bell-curve arrivals |
| **Trend Up** | Increasing arrival rate |
| **Trend Down** | Decreasing arrival rate |

### Simulation Outputs

- Completion rates and average times
- Resource utilization per role
- Cost per flow instance
- TAT compliance percentage
- Bottleneck identification
- Queue visualization
- Live timeline charts

---

## 13. Analytics & Reporting

### 13.1 Built-in Analytics

| Metric | Description |
|--------|-------------|
| Total tasks | Count of all tasks across all flows |
| Completed tasks | Successfully finished tasks |
| Overdue tasks | Tasks that missed their TAT |
| On-time rate | Percentage of tasks completed within TAT |
| Average resolution time | Mean time to complete tasks |
| Flow performance | Per-system completion and on-time rates |
| Weekly scoring | Gamified user rankings by task completion |
| Doer performance | Individual user productivity metrics |

### 13.2 Business Status Matrix — Diagnose Your Business Health

Use the **Completion Rate** (Productivity) and **On-Time Rate** (Efficiency) from the analytics dashboard to instantly understand where your business stands:

| Productivity (Completion Rate) | Efficiency (On-Time Rate) | Business Status           | Situation Meaning                                        | Action Plan                                                              |
| ------------------------------ | ------------------------- | ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| High (80–100%)                 | High (80–100%)            | 🚀 Growth Ready           | टीम काम पूरा भी कर रही है और समय पर भी कर रही है         | आक्रामक ग्रोथ, नया बिजनेस लें, मार्केटिंग बढ़ाएँ, ऑटोमेशन में निवेश करें |
| High (80–100%)                 | Low (<70%)                | ⚠ Overloaded System       | काम पूरा हो रहा है लेकिन देरी से – टीम पर लोड ज्यादा है  | स्टाफ बढ़ाएँ, वर्कलोड बैलेंस करें, TAT रिव्यू करें                       |
| Medium (50–80%)                | High (80–100%)            | 📉 Underutilized Capacity | टीम समय पर काम कर सकती है लेकिन टास्क कम पूरे हो रहे हैं | अधिक काम लाएँ, सेल्स बढ़ाएँ, टास्क फ्लो ऑडिट करें                        |
| Medium (50–80%)                | Medium (50–80%)           | 😐 Stable but Slow        | सिस्टम चल रहा है पर तेज नहीं है                          | SOP सुधारें, मॉनिटरिंग बढ़ाएँ, माइक्रो-ट्रेनिंग दें                      |
| Low (<50%)                     | High (80–100%)            | 🧭 Misaligned Execution   | लोग समय पर रिपोर्ट कर रहे हैं पर आउटपुट कम है            | KPI री-डिफाइन करें, आउटपुट-आधारित ट्रैकिंग करें                          |
| Low (<50%)                     | Low (<50%)                | 🔥 Critical Condition     | काम भी पूरा नहीं हो रहा और समय भी खराब                   | तुरंत सिस्टम ऑडिट, जिम्मेदारी तय करें, सख्त फॉलोअप, रीस्ट्रक्चरिंग       |

> **How to read:** Open Analytics Dashboard → note your **Completion Rate** and **On-Time Rate** → find the matching row → the Business Status, Meaning, and Action Plan tell you exactly what to do next.

### 13.3 Advanced Reporting (Power BI-style)

Build custom queries over your data:

**Filter Operators:** `equals`, `not_equals`, `contains`, `not_contains`, `greater_than`, `less_than`, `between`, `in`, `not_in`, `exists`

**Aggregation Operations:** `count`, `sum`, `average`, `min`, `max`

**Chart Types:** Bar, Line, Pie, Table

### 13.3 Data Export

| Export Type | Format |
|-------------|--------|
| Tasks | CSV |
| Form responses | ZIP (CSV per form) |
| Flow data | CSV |
| User data | CSV |
| Uploaded files | ZIP archive |
| Webhook logs | CSV |
| Audit logs | CSV |
| Billing data | CSV |

---

## 14. Role-Based Access Control

### 14.1 Role Hierarchy

```
Super Admin (Platform Level)
  └─→ Admin (Organization Level)
        └─→ User (Task Execution Level)
```

### 14.2 Permission Matrix

| Capability | Super Admin | Admin | User |
|-----------|:-----------:|:-----:|:----:|
| Create/edit flow rules | ✅ | ✅ | ❌ |
| Design forms | ✅ | ✅ | ❌ |
| Start flows | ✅ | ✅ | ❌ |
| Complete assigned tasks | ✅ | ✅ | ✅ |
| View all tasks | ✅ | ✅ | ❌ (own only) |
| View analytics | ✅ | ✅ | ✅ (limited) |
| Manage users | ✅ | ✅ | ❌ |
| Configure TAT | ✅ | ✅ | ❌ |
| Manage API keys | ✅ | ✅ | ❌ |
| Configure webhooks | ✅ | ✅ | ❌ |
| Manage organizations | ✅ | ❌ | ❌ |
| View billing/challans | ✅ | ✅ | ❌ |
| Export data | ✅ | ✅ | ❌ |
| Run simulator | ✅ | ✅ | ❌ |
| View form responses | ✅ | ✅ | ❌ |

---

## 15. Real-World Business Use Cases

### 15.1 Customer Onboarding (B2B)

```
Flow: "Customer Onboarding"
├─ Step 1: Sales fills Customer Details form (text, select, file upload)
├─ Step 2: KYC Verification — parallel:
│    ├─ Document Verification (file review)
│    └─ Background Check (checkbox checklist)
├─ Step 3: (merge: all) → Manager Approval (radio: approve/reject)
├─ Step 4: (approved) → Account Setup (text fields for credentials)
└─ Step 5: Welcome Email (auto-triggered via form communication add-on)
```

**Business Impact:** Reduces onboarding from 7 days to 2 days. Every step tracked with TAT. No customer falls through the cracks.

---

### 15.2 Purchase Order Approval

```
Flow: "Purchase Order"
├─ Step 1: Requester fills PO Form (table: line items with quantity, price)
├─ Step 2: (amount < 50000) → Department Head Approval (1 day TAT)
│          (amount >= 50000) → VP Approval (2 day TAT)
├─ Step 3: Finance Review (number fields for budget codes)
├─ Step 4: Vendor Notification (auto-email with order details)
└─ Step 5: Goods Receipt Confirmation (file upload for delivery proof)
```

**Business Impact:** Automated routing based on amount. Full audit trail. Finance visibility. No lost POs.

---

### 15.3 Employee Leave Management

```
Flow: "Leave Approval"
├─ Step 1: Employee submits Leave Request (date picker, select: leave type, textarea: reason)
├─ Step 2: Manager Review (radio: approve/reject/hold, textarea: remarks)
│    ├─ (approved) → HR Recording
│    ├─ (rejected) → Employee Notification
│    └─ (hold) → Request Clarification → back to Step 1
└─ Step 3: HR updates Leave Balance
```

**Business Impact:** No more email chains. Transparent status. Historical leave data for compliance.

---

### 15.4 Quality Inspection

```
Flow: "QC Inspection"
├─ Step 1: Production submits Batch Details (number: batch ID, text: product name)
├─ Step 2: QC Inspector fills Inspection Checklist (checkbox: 15 quality parameters)
│    ├─ (passed) → Warehouse Release
│    └─ (failed) → Rework Order
├─ Step 3a: Warehouse Release (text: storage location, date: release date)
└─ Step 3b: Rework → Production Manager review → back to Step 1 (loop)
```

**Business Impact:** Zero missed inspections. Quality data captured digitally. Defect trends visible in analytics.

---

### 15.5 Invoice Processing

```
Flow: "Invoice Processing"
├─ Step 1: Vendor submits Invoice (file upload: invoice PDF, table: line items)
├─ Step 2: AP Clerk verifies (number: PO match, radio: match/mismatch)
│    ├─ (match) → Manager Approval
│    └─ (mismatch) → Vendor Clarification (loop)
├─ Step 3: Manager Approval (radio: approve/reject, 4-hour TAT)
└─ Step 4: Payment Processing (date: payment date, text: transaction reference)
```

**Business Impact:** Faster payment cycles. Dispute resolution tracked. Vendor satisfaction improved.

---

### 15.6 IT Service Desk / Helpdesk

```
Flow: "IT Support Ticket"
├─ Step 1: User submits Ticket (select: category, select: priority, textarea: description)
├─ Step 2: L1 Support triage (select: severity, radio: resolve/escalate)
│    ├─ (resolved) → User Confirmation
│    └─ (escalate) → L2 Support
├─ Step 3: L2 Support (textarea: root cause, file: screenshots)
│    ├─ (resolved) → User Confirmation
│    └─ (escalate) → L3 Engineering
└─ Step 4: User Confirmation (radio: satisfied/reopen)
     └─ (reopen) → back to L1 (loop)
```

**Business Impact:** SLA compliance tracked via TAT. Escalation paths automated. Resolution metrics in analytics.

---

### 15.7 Compliance Audit

```
Flow: "Annual Compliance Audit"
├─ Step 1: Auditor initiates (select: department, date: audit period)
├─ Step 2: Department submits Evidence — parallel:
│    ├─ Financial Records (file upload)
│    ├─ Policy Documents (file upload)
│    └─ Employee Certifications (table: name, cert date, expiry)
├─ Step 3: (merge: all) → Auditor Review (checkbox: compliance checklist)
├─ Step 4: (compliant) → Issue Certificate
│          (non-compliant) → Corrective Action Plan → reassign → loop
└─ Step 5: Final Report (file upload: audit report PDF)
```

**Business Impact:** Ensure nothing is missed. Parallel evidence collection saves weeks. Full audit trail for regulators.

---

### 15.8 E-commerce Order Fulfillment

```
Flow: "Order Fulfillment"  (triggered via API from your website)
├─ Step 1: Order Received (auto-created via API with initialFormData)
├─ Step 2: Parallel processing:
│    ├─ Payment Verification (auto/manual)
│    └─ Inventory Check (number: available stock)
├─ Step 3: (merge: all) → Warehouse Picking (table: item, qty, bin location)
├─ Step 4: Quality Check (checkbox: packaging checklist)
├─ Step 5: Shipping (text: tracking number, select: carrier)
├─ Step 6: Delivery Confirmation (date: delivered date)
└─ Webhook: flow.completed → update your website order status
```

**Business Impact:** End-to-end visibility. API integration with your storefront. Real-time webhook updates to customers.

---

## 16. Quick-Start Checklist

Follow these steps to go from zero to a running workflow:

- [ ] **1. Organization Setup** — Complete your company profile (name, domain, industry)
- [ ] **2. Add Users** — Create user accounts with correct roles (admin/user)
- [ ] **3. Configure TAT** — Set office hours, timezone, and weekend days
- [ ] **4. Build Forms** — Create form templates for each data collection point
- [ ] **5. Design Flow Rules** — Define your workflow system with rules:
  - Create the **start rule** (empty current task)
  - Add **transition rules** for each status outcome
  - Set **TAT type and value** for each step
  - Attach **forms** where data collection is needed
  - Configure **transfers** for delegation capability
  - Set **merge conditions** for parallel paths
- [ ] **6. Visualize** — Open the Visual Flow Builder to verify your design
- [ ] **7. Test** — Run the Advanced Simulator to find bottlenecks
- [ ] **8. Go Live** — Start your first flow instance!
- [ ] **9. Monitor** — Track performance in Analytics dashboard
- [ ] **10. Integrate** — Set up API keys and webhooks for external systems

---

## Summary: How Flow Rules & Forms Help Your Business

| Business Need | Process Sutra Solution |
|--------------|----------------------|
| **Eliminate manual tracking** | Automated task creation and assignment |
| **Enforce SLAs** | TAT system with overdue alerts |
| **Ensure accountability** | Every task has a named assignee with timestamps |
| **Collect structured data** | 9 form field types covering every data need |
| **Route work intelligently** | Decision branching based on completion status |
| **Handle parallel work** | Fork/merge patterns with configurable merge conditions |
| **Enable revisions** | Loop patterns for review-resubmit cycles |
| **Integrate with existing systems** | REST API + webhooks for any external tool |
| **Communicate automatically** | Email & WhatsApp on form submission |
| **Store documents safely** | Google Drive integration for file uploads |
| **Track performance** | Real-time analytics, scoring, and reporting |
| **Test before deploying** | Advanced simulator with cost analysis |
| **Audit everything** | Full audit logs, transfer tracking, cancellation records |
| **Scale across teams** | Multi-organization, role-based access control |
| **Bill accurately** | Usage-based billing with automated challans |

---

*Process Sutra — Automate workflows. Empower teams. Deliver on time.*
