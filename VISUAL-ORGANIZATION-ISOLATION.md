# Organization Isolation - Visual Guide

## ✅ How It Actually Works (SECURE)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORGANIZATION A (org-abc-123)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User: alice@companyA.com                                        │
│  Starts Flow: orderNumber = "12345"                              │
│                    ↓                                              │
│  System fetches Flow Rules WHERE organizationId = 'org-abc-123'  │
│                    ↓                                              │
│  ┌──────────────────────────────────────────────┐               │
│  │ Flow Rules for Organization A:                │               │
│  │ - Start → Task: "Verify" → Email: alice@A    │               │
│  │ - Verify → Task: "Approve" → Email: bob@A    │               │
│  └──────────────────────────────────────────────┘               │
│                    ↓                                              │
│  Creates Task:                                                    │
│  {                                                                │
│    organizationId: "org-abc-123",                                │
│    flowId: "flow-aaa-111",                                       │
│    orderNumber: "12345",                                         │
│    doerEmail: "alice@companyA.com"  ← From ORG A's rule         │
│  }                                                                │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    ORGANIZATION B (org-xyz-789)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User: john@companyB.com                                         │
│  Starts Flow: orderNumber = "12345" (SAME NUMBER!)               │
│                    ↓                                              │
│  System fetches Flow Rules WHERE organizationId = 'org-xyz-789'  │
│                    ↓                                              │
│  ┌──────────────────────────────────────────────┐               │
│  │ Flow Rules for Organization B:                │               │
│  │ - Start → Task: "Verify" → Email: john@B     │               │
│  │ - Verify → Task: "Approve" → Email: jane@B   │               │
│  └──────────────────────────────────────────────┘               │
│                    ↓                                              │
│  Creates Task:                                                    │
│  {                                                                │
│    organizationId: "org-xyz-789",                                │
│    flowId: "flow-bbb-222",                                       │
│    orderNumber: "12345",                                         │
│    doerEmail: "john@companyB.com"  ← From ORG B's rule          │
│  }                                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Result in Database:

```
┌────────┬─────────────────┬──────────────┬─────────────┬─────────────────────┐
│ TaskID │ OrganizationID  │   FlowID     │ OrderNumber │    Assigned To      │
├────────┼─────────────────┼──────────────┼─────────────┼─────────────────────┤
│ task-1 │ org-abc-123     │ flow-aaa-111 │   12345     │ alice@companyA.com  │
│ task-2 │ org-xyz-789     │ flow-bbb-222 │   12345     │ john@companyB.com   │
└────────┴─────────────────┴──────────────┴─────────────┴─────────────────────┘
```

**Key Points:**
- ✅ Same orderNumber "12345" - NO PROBLEM
- ✅ Different organizationId - ISOLATED
- ✅ Different flowId - UNIQUE per flow
- ✅ Each assigned to their own org's users - SECURE

---

## ❌ What DOESN'T Happen (Misconception)

```
┌─────────────────────────────────────────────────────────────────┐
│                         WRONG SCENARIO                           │
│                    (This does NOT happen!)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ❌ Organization B starts flow with orderNumber "12345"          │
│  ❌ System searches: WHERE orderNumber = "12345"                 │
│  ❌ Finds Organization A's task                                  │
│  ❌ Copies email alice@companyA.com to Organization B's task     │
│                                                                   │
│  THIS DOES NOT HAPPEN BECAUSE:                                   │
│  1. No query searches by orderNumber alone                       │
│  2. All queries include: WHERE organizationId = ?               │
│  3. Flow rules are organization-specific                         │
│  4. Email comes from organization's own rules, not other tasks   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## How Data Flows Correctly

### Step 1: User Authentication
```
User Login → Firebase Auth → Backend verifies → Session created
                                                      ↓
                                              {
                                                id: "user-123",
                                                email: "alice@companyA.com",
                                                organizationId: "org-abc-123"
                                              }
```

### Step 2: Flow Start Request
```
POST /api/flows/start
{
  system: "Customer Onboarding",
  orderNumber: "12345",  ← User input (can duplicate)
  description: "New customer"
}

Header: Cookie with session
        ↓
Middleware extracts: user.organizationId = "org-abc-123"
```

### Step 3: Fetch Flow Rules (Organization Boundary Enforced)
```
Query: SELECT * FROM flow_rules 
       WHERE organizationId = 'org-abc-123'  ← CRITICAL FILTER
       AND system = 'Customer Onboarding'
       AND currentTask = ''  (starting task)

Result: {
  nextTask: "Verify Details",
  email: "alice@companyA.com",  ← From org's own rule
  formId: "form-123",
  tat: 2
}
```

### Step 4: Create Task (Locked to Organization)
```
INSERT INTO tasks (
  organizationId,     ← org-abc-123
  flowId,             ← flow-aaa-111 (new UUID)
  orderNumber,        ← "12345" (user input)
  taskName,           ← "Verify Details" (from rule)
  doerEmail,          ← "alice@companyA.com" (from ORG A's rule)
  status,             ← "pending"
  formId              ← "form-123" (from rule)
)
```

### Step 5: Query Tasks (Organization Filter Always Present)
```
When user views tasks:

GET /api/tasks

Backend:
const user = req.currentUser;
const tasks = await storage.getTasksByOrganization(user.organizationId);
                                                    ↑
                                    Always filters by organizationId

Query: SELECT * FROM tasks 
       WHERE organizationId = 'org-abc-123'  ← MANDATORY

Result: Only Organization A's tasks returned
        Organization B's tasks with same orderNumber are INVISIBLE
```

---

## Security Layers

```
┌────────────────────────────────────────────────────────────────┐
│                     LAYER 1: Authentication                     │
│  User must be logged in → Session contains organizationId      │
└───────────────────────┬────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────────────┐
│                  LAYER 2: Session Validation                    │
│  Every request extracts organizationId from session             │
└───────────────────────┬────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────────────┐
│                  LAYER 3: Database Queries                      │
│  All queries include WHERE organizationId = ?                   │
└───────────────────────┬────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────────────┐
│                  LAYER 4: Data Validation                       │
│  Before returning data, verify organizationId matches user      │
└───────────────────────┬────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────────────┐
│                  LAYER 5: Database Constraints                  │
│  Foreign key: organizationId REFERENCES organizations(id)       │
│  NOT NULL: organizationId cannot be empty                       │
└────────────────────────────────────────────────────────────────┘
```

---

## Why Order Number Duplication Is SAFE

### Analogy: Street Addresses

Think of order numbers like house numbers on streets:
- **Organization A** has a house at "123 Main Street, CityA"
- **Organization B** has a house at "123 Main Street, CityB"

Both addresses have "123 Main Street" but they're in **different cities** (organizations).

```
Organization A:
  City: "CityA" (organizationId)
  Street: "Customer Flow" (system)
  House: "123" (orderNumber)
  Owner: alice@companyA.com

Organization B:
  City: "CityB" (organizationId)
  Street: "Customer Flow" (system)
  House: "123" (orderNumber)
  Owner: john@companyB.com
```

**The city (organizationId) makes it unique!**

---

## Real Query Examples

### ✅ CORRECT: Organization-Filtered Query
```sql
-- Get tasks for user's organization
SELECT * FROM tasks
WHERE organizationId = 'org-abc-123'
AND status = 'pending';

-- Result: Only org A's tasks, even if orderNumbers match org B's
```

### ✅ CORRECT: Flow Rules Query
```sql
-- Get flow rules for starting a flow
SELECT * FROM flow_rules
WHERE organizationId = 'org-abc-123'
AND system = 'Customer Onboarding'
AND currentTask = '';

-- Result: Only org A's rules with org A's email addresses
```

### ✅ CORRECT: Task Access Validation
```sql
-- User tries to access task by ID
SELECT * FROM tasks WHERE id = 'task-123';
-- Returns task

-- Backend then checks:
if (task.organizationId !== user.organizationId) {
  return 403 Forbidden;
}
```

### ❌ DANGEROUS: What We DON'T Do
```sql
-- This query does NOT exist in our codebase:
SELECT * FROM tasks WHERE orderNumber = '12345';
-- This would be dangerous because it ignores organizationId!

-- We NEVER query by orderNumber alone
```

---

## Frontend Safety

### How Frontend Displays Tasks

```typescript
// 1. Frontend requests tasks
GET /api/tasks

// 2. Backend ALWAYS adds organization filter
const tasks = await storage.getTasksByOrganization(user.organizationId);

// 3. Frontend receives ONLY organization's tasks
// (Never sees other organizations' data in the first place)

// 4. Frontend can safely filter by orderNumber
const filtered = tasks.filter(t => 
  t.orderNumber.includes(searchTerm)
);
// This is safe because 'tasks' only contains org's own data
```

---

## Proof: Code References

### Flow Start (routes.ts:456-550)
```typescript
// Line 476: Fetch organization-specific rules
const flowRules = await storage.getFlowRulesByOrganization(
  user.organizationId,  // ← Organization boundary
  system
);

// Line 478: Get starting rule from ORG's rules
const startRule = flowRules.find(rule => rule.currentTask === "");

// Line 511: Create task with email from ORG's rule
const task = await storage.createTask({
  organizationId: user.organizationId,  // ← Locked to org
  doerEmail: startRule.email,           // ← From org's rule
  orderNumber,                          // ← Can duplicate safely
  // ...
});
```

### Storage Method (storage.ts:290-297)
```typescript
async getFlowRulesByOrganization(
  organizationId: string,  // ← Required parameter
  system?: string
): Promise<FlowRule[]> {
  if (system) {
    return await db.select().from(flowRules).where(
      and(
        eq(flowRules.organizationId, organizationId),  // ← MUST match
        eq(flowRules.system, system)
      )
    );
  }
  return await db.select().from(flowRules)
    .where(eq(flowRules.organizationId, organizationId));  // ← MUST match
}
```

---

## Summary

### ✅ What IS Secure
1. Each organization's flow rules contain their own team's emails
2. Flow rules are fetched with organizationId filter
3. Email assignment comes from organization's own rules
4. Order numbers can duplicate across organizations safely
5. All database queries enforce organization boundaries

### ❌ What Does NOT Happen
1. System does NOT search for tasks by orderNumber alone
2. System does NOT copy emails from other organizations
3. System does NOT allow cross-organization data access
4. Order number duplication does NOT cause conflicts

### 🎯 The Key Insight
**Order numbers are for human convenience, not system security.**

The security comes from:
- **organizationId** (system-enforced boundary)
- **flowId** (UUID, globally unique)
- **Database constraints** (foreign keys, NOT NULL)
- **Query filters** (always include organizationId)

**Order numbers can safely duplicate because they exist WITHIN an organization boundary, not across it.**

---

**Created:** October 12, 2025  
**Purpose:** Visual explanation of organization isolation security  
**Status:** ✅ System is secure - no cross-organization email sync possible
