# Visual Flow Builder - Merge Condition Feature

## ✅ Implementation Complete

The merge condition feature has been successfully added to the Visual Flow Builder!

---

## 🎯 What's New

### 1. **Merge Condition Dropdown in Dialogs**

When creating or editing a flow rule in the Visual Flow Builder, you now have a new field:

**Location:** Add New Flow Rule / Edit Flow Rule Dialog

**Field Name:** "Merge Condition (For Parallel Steps)"

**Options:**
- **All Steps Complete** (Default) - Next step starts only after ALL parallel steps are completed
- **Any Step Complete** - Next step starts as soon as ANY parallel step is completed

---

## 📍 Where to Find It

### In the Visual Flow Builder:

1. Navigate to **Visual Flow Builder** page
2. Select a flow system
3. Click **"+ Add Rule"** or **Edit** an existing rule
4. Scroll down to find the **"Merge Condition"** dropdown
5. It appears after the "Form ID" field

---

## 🎨 Visual Indicators

### On Flow Nodes:

Nodes with **multiple parent connections** (merge points) now display a merge badge:

```
┌────────────────────────┐
│  Task Name             │
│  Assignee              │
│                        │
│  TAT: 2 hours          │
│  Form: f001            │
│  Merge: ⚡ Any   ← NEW!│
└────────────────────────┘
```

**Badge Colors:**
- **Orange "⚡ Any"** - Any Step Complete mode (fast merge)
- **Gray "✓ All"** - All Steps Complete mode (wait for all)

**When shown:** Only displayed on nodes that have 2+ parent connections (merge points)

---

## 🔧 Technical Details

### Changes Made:

1. **FlowRule Interface** - Added `mergeCondition?: "all" | "any"`
2. **FlowChartNode Interface** - Added `mergeCondition?: "all" | "any"`
3. **New Rule State** - Includes merge condition with default "all"
4. **Add Rule Dialog** - New dropdown for selecting merge condition
5. **Edit Rule Dialog** - New dropdown for modifying merge condition
6. **Reset Form** - Resets merge condition to "all"
7. **Node Display** - Visual badge for merge condition on multi-parent nodes
8. **Flow Chart Builder** - Propagates merge condition to nodes

### Files Modified:

- `client/src/pages/visual-flow-builder.tsx`

---

## 📊 Usage Examples

### Example 1: Quality Control Gates (Use "All Steps Complete")

```
Parallel Process:
├── Chemical Analysis → Done
├── Physical Testing → Done
└── Documentation Review → Done
                ↓
      Final Approval (merge: all)
```

✅ Use **"All Steps Complete"** - Final Approval starts only when ALL three tests are done

---

### Example 2: First Responder System (Use "Any Step Complete")

```
Parallel Tasks:
├── Email Support Team → Responded
├── Call Customer → Connected
└── SMS Notification → Sent
                ↓
      Follow-up Action (merge: any)
```

⚡ Use **"Any Step Complete"** - Follow-up starts as soon as ANY team responds first

---

## 🎯 How It Works

### All Steps Complete (Default):
- System waits for **ALL** parallel paths to finish
- Next task created only when every prerequisite is completed
- **Use when:** You need complete information from all sources

### Any Step Complete:
- System proceeds with **first** completed path
- Next task created immediately when any prerequisite completes
- **Use when:** Speed is critical and any path provides sufficient info

---

## 🧪 Testing Your Flows

### Test Scenario:

1. **Create a flow with parallel paths:**
   ```
   Start → Task A (Status: Approved) → Task C
   Start → Task B (Status: Done) → Task C
   ```

2. **Set Task C's merge condition**
   - Edit the rules pointing to Task C
   - Change merge condition to test both behaviors

3. **Run a flow instance:**
   - Complete Task A first
   - With "Any": Task C starts immediately
   - With "All": Task C waits for Task B

---

## 💡 Best Practices

### When to use "All Steps Complete":
- ✅ Quality gates requiring multiple approvals
- ✅ Data gathering from multiple sources
- ✅ Compliance checks needing full verification
- ✅ Assembly processes requiring all components

### When to use "Any Step Complete":
- ⚡ Emergency response systems
- ⚡ First-response customer service
- ⚡ Parallel redundant processes
- ⚡ Race conditions where first wins

---

## 🔍 Visual Flow Builder Features

### How Merge Conditions Show Up:

1. **In the Builder:**
   - Nodes with multiple incoming connections show merge badges
   - Orange badge (⚡ Any) = Fast merge
   - Gray badge (✓ All) = Complete merge

2. **In Rule Dialogs:**
   - Dropdown clearly explains each option
   - Helper text provides context
   - Default is always "All Steps Complete" for safety

3. **On the Canvas:**
   - Merge point nodes are visually distinct
   - Easy to identify parallel convergence points
   - Hover tooltips explain merge behavior

---

## 🚀 Getting Started

1. **Open Visual Flow Builder**
   - Navigate to: Visual Flow Builder page
   - Select your flow system

2. **Create Parallel Paths**
   - Add rules that lead to the same next task
   - This creates a merge point

3. **Set Merge Condition**
   - Edit any rule leading to the merge point
   - Choose "All" or "Any" based on your needs
   - Save the rule

4. **Verify Visually**
   - The target node will show the merge badge
   - Check the badge color matches your choice

---

## 📝 Notes

- **Backward Compatible:** All existing rules default to "All Steps Complete"
- **Per-Rule Setting:** Each rule can have its own merge condition
- **Visual Feedback:** Nodes clearly indicate merge behavior
- **Database:** Column added via migration 0006_add_merge_condition.sql

---

## ✨ Summary

The Visual Flow Builder now supports advanced parallel flow control with merge conditions! You can:

✅ Choose between "All" and "Any" merge strategies  
✅ See merge conditions visually on the flow diagram  
✅ Create sophisticated workflows with parallel processing  
✅ Optimize for speed (Any) or completeness (All)

Happy building! 🎉
