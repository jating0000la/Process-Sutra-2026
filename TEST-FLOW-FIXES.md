# Manual Testing Guide - Flow Management Fixes

**Date:** October 13, 2025  
**Tester:** _____________  
**Environment:** Development/Staging  

---

## Test Checklist

- [ ] **Test 1:** Organization Isolation - Cross-org access denied
- [ ] **Test 2:** Duplicate Rule Prevention - 409 Conflict error
- [ ] **Test 3:** Cycle Detection - Self-reference blocked
- [ ] **Test 4:** Cycle Detection - Two-step cycle blocked
- [ ] **Test 5:** Rate Limiting - 21st request gets 429

---

## Prerequisites

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Verify server is running:**
   ```bash
   curl http://localhost:5000/api/health
   ```
   Expected: `{"ok": true, ...}`

3. **Have two test user accounts ready:**
   - User A (Org A) - admin@org-a.com
   - User B (Org B) - admin@org-b.com

---

## Test 1: Organization Isolation Bypass Fix ✅

**Objective:** Verify users cannot update tasks from other organizations

### Setup
1. Login as User A (Org A)
2. Create a test flow and task in Org A
3. Note the task ID

### Test Steps

**Step 1.1: Login as User B (different organization)**
```bash
# Navigate to login page
# Login with: admin@org-b.com
```

**Step 1.2: Get User B's token**
```javascript
// Open browser console (F12)
// Run:
console.log(localStorage.getItem('authToken'));
// Copy the token
```

**Step 1.3: Try to update Org A's task from Org B's account**
```bash
# Replace {ORG_A_TASK_ID} with actual task ID
# Replace {ORG_B_TOKEN} with User B's token

curl -X PATCH http://localhost:5000/api/tasks/{ORG_A_TASK_ID}/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ORG_B_TOKEN}" \
  -d '{"status": "completed"}'
```

### Expected Result
```json
{
  "message": "Access denied: Task belongs to different organization"
}
```
**HTTP Status:** 403 Forbidden

### Actual Result
- HTTP Status: _______
- Response: _______________________________________
- ✅ PASS / ❌ FAIL

### Notes
_________________________________________________________________

---

## Test 2: Duplicate Rule Prevention ✅

**Objective:** Verify system rejects duplicate flow rules

### Setup
1. Login as Admin user
2. Navigate to Flows page
3. Select a test system (e.g., "Test System")

### Test Steps

**Step 2.1: Create first flow rule**
```
System: Test System
Current Task: [START] (leave empty)
Status: (leave empty)
Next Task: Task A
TAT: 1
TAT Type: Day TAT
Doer: Test User
Email: test@example.com
Form ID: (leave empty)
```
Click "Create Flow Rule"

### Expected Result
✅ Success message: "Flow rule created successfully"

**Step 2.2: Try to create duplicate rule (same start rule)**
```
System: Test System
Current Task: [START] (leave empty)  ← SAME
Status: (leave empty)                ← SAME
Next Task: Task B                    ← DIFFERENT
TAT: 1
TAT Type: Day TAT
Doer: Another User
Email: another@example.com
```
Click "Create Flow Rule"

### Expected Result
```json
{
  "message": "Duplicate flow rule detected. A rule already exists for task \"\" with status \"\". Please edit the existing rule instead of creating a new one.",
  "existingRule": {
    "id": "...",
    "nextTask": "Task A",
    "doer": "Test User",
    "email": "test@example.com"
  }
}
```
**HTTP Status:** 409 Conflict

### Actual Result
- HTTP Status: _______
- Toast/Error Message: _______________________________________
- ✅ PASS / ❌ FAIL

### Notes
_________________________________________________________________

---

## Test 3: Cycle Detection - Self-Reference ✅

**Objective:** Verify self-referencing rules are blocked

### Setup
1. Login as Admin user
2. Navigate to Flows page

### Test Steps

**Step 3.1: Try to create self-referencing rule**
```
System: Test System
Current Task: Task Loop
Status: Done
Next Task: Task Loop    ← POINTS TO ITSELF!
TAT: 1
TAT Type: Hour TAT
Doer: Test User
Email: test@example.com
```
Click "Create Flow Rule"

### Expected Result
```json
{
  "message": "Cannot create flow rule: Circular dependency detected",
  "error": "Self-referencing rule detected: Task \"Task Loop\" points to itself. This would create an infinite loop.",
  "cycle": ["Task Loop", "Task Loop"],
  "suggestion": "Review your workflow design to remove the loop. Tasks should not reference themselves or create circular paths."
}
```
**HTTP Status:** 400 Bad Request

### Actual Result
- HTTP Status: _______
- Error Message: _______________________________________
- Cycle Path: _______________________________________
- ✅ PASS / ❌ FAIL

### Notes
_________________________________________________________________

---

## Test 4: Cycle Detection - Two-Step Cycle ✅

**Objective:** Verify two-step circular dependencies are detected

### Setup
1. Login as Admin user
2. Navigate to Flows page
3. System should have no existing rules (or use unique task names)

### Test Steps

**Step 4.1: Create first rule (A → B)**
```
System: Cycle Test
Current Task: Task A
Status: Done
Next Task: Task B
TAT: 1
TAT Type: Day TAT
Doer: Test User
Email: test@example.com
```
Click "Create Flow Rule"

### Expected Result
✅ Success: "Flow rule created successfully"

**Step 4.2: Try to create second rule (B → A) - creates cycle!**
```
System: Cycle Test
Current Task: Task B
Status: Done
Next Task: Task A       ← CREATES LOOP: A→B→A
TAT: 1
TAT Type: Day TAT
Doer: Test User
Email: test@example.com
```
Click "Create Flow Rule"

### Expected Result
```json
{
  "message": "Cannot create flow rule: Circular dependency detected",
  "error": "Circular dependency detected: Task A → Task B → Task A. This would create an infinite workflow loop.",
  "cycle": ["Task A", "Task B", "Task A"],
  "suggestion": "Review your workflow design to remove the loop. Tasks should not reference themselves or create circular paths."
}
```
**HTTP Status:** 400 Bad Request

### Actual Result
- HTTP Status: _______
- Error Message: _______________________________________
- Cycle Path: _______________________________________
- ✅ PASS / ❌ FAIL

### Notes
_________________________________________________________________

---

## Test 5: Rate Limiting ✅

**Objective:** Verify rate limiter blocks excessive flow start requests

### Setup
1. Login as regular user (not admin)
2. Get authentication token

### Test Steps

**Step 5.1: Send 25 flow start requests rapidly**

Create a test script `test-rate-limit.ps1`:
```powershell
# test-rate-limit.ps1
$token = "YOUR_AUTH_TOKEN_HERE"
$url = "http://localhost:5000/api/flows/start"

for ($i = 1; $i -le 25; $i++) {
    $body = @{
        system = "Rate Limit Test"
        orderNumber = "TEST-$i"
        description = "Rate limit test request $i"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method Post `
            -Headers @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            } `
            -Body $body `
            -UseBasicParsing
        
        Write-Host "Request $i : Status $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "Request $i : Status $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        Write-Host "  Message: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Start-Sleep -Milliseconds 500
}
```

**Step 5.2: Run the script**
```powershell
.\test-rate-limit.ps1
```

### Expected Result
```
Request 1 : Status 201    ✅
Request 2 : Status 201    ✅
Request 3 : Status 201    ✅
...
Request 20 : Status 201   ✅
Request 21 : Status 429   ❌ Rate limit exceeded
Request 22 : Status 429   ❌ Rate limit exceeded
...
Request 25 : Status 429   ❌ Rate limit exceeded
```

**Response for 429:**
```json
{
  "message": "Too many flow start requests. Please try again later."
}
```

**Headers on 429 response:**
```
RateLimit-Limit: 20
RateLimit-Remaining: 0
RateLimit-Reset: <timestamp>
```

### Actual Result
- Requests 1-20: _______ (should be 201)
- Requests 21-25: _______ (should be 429)
- Rate limit headers present: ✅ YES / ❌ NO
- ✅ PASS / ❌ FAIL

### Notes
_________________________________________________________________

---

## Test 6: Verify Admin Bypass (Optional)

**Objective:** Verify admin users can bypass rate limit

### Test Steps

**Step 6.1: Login as admin user**
```bash
# Get admin token
```

**Step 6.2: Send 25 requests as admin**
```powershell
# Run same test script with admin token
.\test-rate-limit.ps1
```

### Expected Result
All 25 requests should succeed (201 Created)

### Actual Result
- All requests succeeded: ✅ YES / ❌ NO
- ✅ PASS / ❌ FAIL

---

## Alternative: API Testing with Postman/Insomnia

### Test 1: Organization Isolation
```
Method: PATCH
URL: http://localhost:5000/api/tasks/{task_id}/status
Headers:
  Authorization: Bearer {wrong_org_token}
  Content-Type: application/json
Body:
  {
    "status": "completed"
  }
Expected: 403 Forbidden
```

### Test 2: Duplicate Rule
```
Method: POST
URL: http://localhost:5000/api/flow-rules
Headers:
  Authorization: Bearer {admin_token}
  Content-Type: application/json
Body:
  {
    "system": "Test",
    "currentTask": "",
    "status": "",
    "nextTask": "Task A",
    "tat": 1,
    "tatType": "daytat",
    "doer": "User",
    "email": "user@test.com"
  }
Execute twice - second should return 409
```

### Test 3: Self-Reference
```
Method: POST
URL: http://localhost:5000/api/flow-rules
Headers:
  Authorization: Bearer {admin_token}
  Content-Type: application/json
Body:
  {
    "system": "Test",
    "currentTask": "Loop Task",
    "status": "Done",
    "nextTask": "Loop Task",  ← Self-reference
    "tat": 1,
    "tatType": "daytat",
    "doer": "User",
    "email": "user@test.com"
  }
Expected: 400 Bad Request with cycle info
```

### Test 4: Two-Step Cycle
```
Step 1: Create Task A → Task B (201 Created)
Step 2: Create Task B → Task A (400 Bad Request)
```

### Test 5: Rate Limiting
```
Use Postman Runner:
- Collection with 25 requests
- Set delay: 500ms between requests
- Check: Requests 1-20 succeed, 21-25 fail with 429
```

---

## Quick Test via Browser Console

For a quick smoke test, run this in browser console (F12):

```javascript
// Test organization isolation
async function testOrgIsolation() {
  // Get a task ID from another organization
  const wrongOrgTaskId = 'REPLACE_WITH_ACTUAL_TASK_ID';
  
  const response = await fetch(`/api/tasks/${wrongOrgTaskId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify({ status: 'completed' })
  });
  
  console.log('Status:', response.status);
  console.log('Expected: 403');
  const data = await response.json();
  console.log('Response:', data);
}

// Test duplicate rule
async function testDuplicateRule() {
  const ruleData = {
    system: 'Test',
    currentTask: '',
    status: '',
    nextTask: 'Duplicate Test',
    tat: 1,
    tatType: 'daytat',
    doer: 'Test',
    email: 'test@example.com'
  };
  
  // Create first time
  const response1 = await fetch('/api/flow-rules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify(ruleData)
  });
  
  console.log('First creation:', response1.status);
  
  // Try to create again (should fail)
  const response2 = await fetch('/api/flow-rules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify(ruleData)
  });
  
  console.log('Second creation:', response2.status);
  console.log('Expected: 409');
  const data = await response2.json();
  console.log('Response:', data);
}

// Run tests
await testOrgIsolation();
await testDuplicateRule();
```

---

## Test Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Organization Isolation | ⬜ | |
| 2. Duplicate Prevention | ⬜ | |
| 3. Self-Reference Cycle | ⬜ | |
| 4. Two-Step Cycle | ⬜ | |
| 5. Rate Limiting | ⬜ | |

**Overall Result:** ⬜ PASS / ⬜ FAIL

**Tester Signature:** _________________  
**Date Completed:** _________________

---

## Troubleshooting

### Issue: 401 Unauthorized
**Solution:** Token expired. Re-login and get fresh token.

### Issue: 500 Internal Server Error
**Solution:** Check server logs: `npm run dev` terminal output

### Issue: Rate limit not working
**Solution:** 
1. Verify express-rate-limit is installed
2. Check if user has admin role (admins bypass rate limit)
3. Clear rate limit cache (restart server)

### Issue: Cycle detection not triggering
**Solution:**
1. Verify cycleDetector.ts is imported correctly
2. Check server logs for cycle detection execution
3. Ensure rules are in same system

---

**END OF TESTING GUIDE**
