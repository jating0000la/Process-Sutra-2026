# 📍 Where to Find the Merge Condition Setting

## Step-by-Step Guide

### 1. **Navigate to Flows Page**
   - Open your browser and go to: `http://localhost:5001`
   - Click on **"Flows"** in the sidebar menu

### 2. **Create or Edit a Flow Rule**
   
   **To Create a New Rule:**
   - Click the **"+ Create Flow Rule"** button at the top of the page
   
   **To Edit an Existing Rule:**
   - Find the flow rule you want to edit
   - Click the **Edit (pencil icon)** button next to the rule

### 3. **Find the Merge Condition Dropdown**
   
   In the flow rule form dialog, scroll down to find:
   
   ```
   ┌─────────────────────────────────────────────────────┐
   │  Form ID (Optional)                                 │
   │  [text input field]                                 │
   └─────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────┐
   │  Merge Condition (For Parallel Steps)  ⬅️ HERE!    │
   │  ┌───────────────────────────────────────────────┐ │
   │  │ Choose when next step should start           ▼│ │
   │  └───────────────────────────────────────────────┘ │
   │  💡 Use this when multiple parallel tasks...       │
   └─────────────────────────────────────────────────────┘
   ```

### 4. **Select Your Option**
   
   Click on the dropdown to see two options:
   
   **Option 1: All Steps Complete** (Default)
   - Next step starts only after ALL parallel steps are completed
   - ✅ Use when: You need all parallel work finished before proceeding
   
   **Option 2: Any Step Complete**
   - Next step starts as soon as ANY parallel step is completed
   - ✅ Use when: You can proceed as soon as any parallel path finishes

### 5. **Save the Rule**
   - Click **"Create Rule"** or **"Update Rule"** button at the bottom

---

## 🎯 When You'll See This Setting

The merge condition is **most important** when you have:

### Example Scenario:
```
Task A (Status: Approved) → Task C
Task B (Status: Done)     → Task C
```

Both Task A and Task B lead to the same Task C. The merge condition controls when Task C starts:

- **"All Steps Complete"**: Task C starts only when BOTH Task A AND Task B are completed
- **"Any Step Complete"**: Task C starts when EITHER Task A OR Task B is completed (whichever finishes first)

---

## 🖼️ Visual Location in Form

The field appears in this order in the Create/Edit Flow Rule dialog:

1. System
2. Current Task
3. Status
4. Next Task
5. TAT
6. TAT Type
7. Doer (Role)
8. Assign to User
9. **Form ID** ← Field above
10. **Merge Condition (For Parallel Steps)** ← **THIS IS IT!** 🎯
11. Task Transfer Options ← Field below

---

## 💡 Quick Tips

- **Default behavior**: If you don't change it, it defaults to "All Steps Complete"
- **Existing rules**: All your existing 23 flow rules are set to "All Steps Complete" by default
- **Edit anytime**: You can change this setting by editing any flow rule at any time
- **Per-rule setting**: Each flow rule can have its own merge condition

---

## 🔍 Can't Find It?

If you don't see the "Merge Condition" dropdown:

1. **Make sure the server is running**: Check that `npm run dev` is active
2. **Refresh the page**: Press F5 or Ctrl+R in your browser
3. **Clear cache**: Try Ctrl+Shift+R (hard refresh)
4. **Check the migration**: Verify the migration completed successfully (you should see "23 rules updated")

---

## 📞 Need Help?

If the field still doesn't appear, there might be an issue with:
- Browser cache
- Server not restarted after migration
- Migration didn't complete successfully

Check the browser console (F12) for any JavaScript errors.
