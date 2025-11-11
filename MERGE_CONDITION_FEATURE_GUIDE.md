# Parallel Flow Merge Condition Feature

## Overview

The **Merge Condition** feature allows you to control how parallel workflows converge at merging points. When multiple parallel steps need to complete before moving to a next step, you can now choose whether to wait for **all steps** or proceed as soon as **any step** completes.

## Feature Details

### What Problem Does This Solve?

In complex workflows, you often have parallel branches that need to merge back into a single next step. For example:

```
Task A ──┐
         ├──> Task D (Merge Point)
Task B ──┤
         │
Task C ──┘
```

Before this feature, the system always waited for **all parallel tasks** (A, B, and C) to complete before starting Task D. Now you have the flexibility to control this behavior.

## Two Merge Condition Options

### 1. **All Steps Complete** (Default)

- **Behavior**: The next step starts **only after ALL** parallel steps are completed
- **Use Case**: When you need all information/approvals from parallel paths before proceeding
- **Example**: 
  - Quality Check from 3 different departments must all complete before final approval
  - Multiple material deliveries must all arrive before starting assembly
  - All team member reviews must be done before making a decision

**Visual Flow Example**:
```
Step A (Complete) ──┐
                    ├──> Next Step (Waits for all)
Step B (Complete) ──┤
                    │
Step C (Pending)  ──┘  ← Blocks next step until complete
```

### 2. **Any Step Complete**

- **Behavior**: The next step starts **as soon as ANY** parallel step is completed
- **Use Case**: When you can proceed with partial information or first-come-first-served scenarios
- **Example**:
  - Start processing as soon as any vendor responds with a quote
  - Begin next phase when first approval is received (don't wait for others)
  - Proceed when any one of multiple optional checks completes

**Visual Flow Example**:
```
Step A (Complete) ──┐  ← Triggers next step immediately
                    ├──> Next Step (Starts now!)
Step B (Pending)  ──┤
                    │
Step C (Pending)  ──┘
```

## How to Use

### Setting Merge Condition When Creating a Flow Rule

1. **Navigate to Flows Page**
   - Go to the main navigation menu
   - Click on "Flows"

2. **Create or Edit a Flow Rule**
   - Click "Create Flow Rule" button
   - OR click "Edit" on an existing rule

3. **Configure the Merge Condition**
   - Scroll to the **"Merge Condition (For Parallel Steps)"** field
   - Choose one of the following options:
     - **All Steps Complete**: Next step starts only after ALL parallel steps are completed
     - **Any Step Complete**: Next step starts as soon as ANY parallel step is completed

4. **Save the Rule**
   - Complete the rest of the form fields
   - Click "Create Rule" or "Update Rule"

### Field Location in the Form

The Merge Condition field appears after the "Form ID" field in the flow rule form, clearly labeled with an informative description.

## Technical Implementation

### Database Schema Changes

The `flow_rules` table now includes a new column:

```sql
merge_condition VARCHAR(10) DEFAULT 'all'
```

**Allowed Values**:
- `'all'` - Wait for all parallel prerequisites (default)
- `'any'` - Proceed when any parallel prerequisite completes

### Backend Logic

The task completion logic in `server/routes.ts` now checks the `mergeCondition` field:

```typescript
if (mergeCondition === "all") {
  // Check if ALL parallel prerequisite tasks are completed
  const allPrerequisitesCompleted = parallelPrerequisites.every(prereqRule => {
    const prereqTask = allFlowTasks.find(
      t => t.taskName === prereqRule.currentTask && t.status === "completed"
    );
    return prereqTask !== undefined;
  });
  
  if (!allPrerequisitesCompleted) {
    continue; // Wait for all steps
  }
} else if (mergeCondition === "any") {
  // Proceed immediately when any parallel step completes
  console.log("Proceeding with next task after single parallel completion");
}
```

### Frontend Changes

The UI form in `client/src/pages/flows.tsx` now includes a select dropdown:

```tsx
<FormField
  control={ruleForm.control}
  name="mergeCondition"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Merge Condition (For Parallel Steps)</FormLabel>
      <Select onValueChange={field.onChange} value={field.value || "all"}>
        <SelectContent>
          <SelectItem value="all">All Steps Complete</SelectItem>
          <SelectItem value="any">Any Step Complete</SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

## Installation & Setup

### 1. Run Database Migration

Before using this feature, you must run the database migration:

```powershell
.\run-merge-condition-migration.ps1
```

This will:
- Add the `merge_condition` column to the `flow_rules` table
- Set default value to `'all'` for all existing rules
- Add validation constraints
- Create a performance index

### 2. Restart Application

After running the migration, restart your application server:

```powershell
npm run dev
# or
npm start
```

### 3. Start Using the Feature

- Navigate to the Flows page
- Create new rules or edit existing ones
- Configure the merge condition as needed

## Use Cases & Examples

### Use Case 1: Manufacturing Quality Control

**Scenario**: A product must pass quality checks from 3 departments before shipping.

**Configuration**: Use **"All Steps Complete"**

```
QC Department 1 ──┐
                  ├──> Ship Product
QC Department 2 ──┤     (Waits for all QC checks)
                  │
QC Department 3 ──┘
```

### Use Case 2: Vendor Quote Collection

**Scenario**: Start negotiations as soon as any vendor responds with a quote.

**Configuration**: Use **"Any Step Complete"**

```
Request Quote from Vendor A ──┐
                              ├──> Start Negotiations
Request Quote from Vendor B ──┤     (First response wins)
                              │
Request Quote from Vendor C ──┘
```

### Use Case 3: Multi-Stage Approval

**Scenario**: Document needs approval from Manager, Legal, and Finance before execution.

**Configuration**: Use **"All Steps Complete"**

```
Manager Approval ──┐
                   ├──> Execute Document
Legal Review     ──┤     (All must approve)
                   │
Finance Sign-off ──┘
```

### Use Case 4: Emergency Response

**Scenario**: Dispatch first available support team to customer site.

**Configuration**: Use **"Any Step Complete"**

```
Check Team A Availability ──┐
                            ├──> Dispatch Team
Check Team B Availability ──┤     (First available goes)
                            │
Check Team C Availability ──┘
```

## Best Practices

### When to Use "All Steps Complete"

✅ Quality control processes requiring multiple approvals
✅ Material collection when all items must be present
✅ Decision-making requiring consensus
✅ Compliance requirements needing complete documentation
✅ Critical path dependencies

### When to Use "Any Step Complete"

✅ First-response scenarios (customer support, emergencies)
✅ Competitive bidding processes
✅ Optional parallel checks where one is sufficient
✅ Race conditions where speed is prioritized
✅ Alternative path executions

### Things to Consider

⚠️ **Data Completeness**: If "Any Step Complete" is used, ensure your next step can handle incomplete data from other parallel branches

⚠️ **Resource Waste**: With "Any Step Complete", other parallel tasks may still be running. Consider if they should be cancelled

⚠️ **Audit Trail**: Both options log which tasks completed and in what order

⚠️ **Default Behavior**: If not specified, the system defaults to "All Steps Complete" to maintain backward compatibility

## Troubleshooting

### Issue: Migration Fails

**Solution**: 
1. Check if `psql` is installed and accessible
2. Verify `DATABASE_URL` is set in environment or `.env.local`
3. Ensure database connection is working
4. Check migration logs for specific errors

### Issue: Merge Condition Not Showing in UI

**Solution**:
1. Clear browser cache
2. Restart the application server
3. Verify migration ran successfully
4. Check browser console for errors

### Issue: Tasks Not Creating as Expected

**Solution**:
1. Check server logs for "[All Steps Complete]" or "[Any Step Complete]" messages
2. Verify the merge condition is saved correctly in the database
3. Ensure all prerequisite tasks have the correct status
4. Review the flow rule configuration

## API Reference

### Flow Rule Schema

```typescript
{
  system: string;
  currentTask: string;
  status: string;
  nextTask: string;
  tat: number;
  tatType: "daytat" | "hourtat" | "beforetat" | "specifytat";
  doer: string;
  email: string;
  formId?: string;
  transferable?: boolean;
  transferToEmails?: string;
  mergeCondition?: "all" | "any"; // NEW FIELD
}
```

### Database Schema

```sql
CREATE TABLE flow_rules (
  id VARCHAR PRIMARY KEY,
  organization_id VARCHAR NOT NULL,
  system VARCHAR NOT NULL,
  current_task VARCHAR DEFAULT '',
  status VARCHAR DEFAULT '',
  next_task VARCHAR NOT NULL,
  tat INTEGER NOT NULL,
  tat_type VARCHAR NOT NULL DEFAULT 'daytat',
  doer VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  form_id VARCHAR,
  transferable BOOLEAN DEFAULT false,
  transfer_to_emails TEXT,
  merge_condition VARCHAR(10) DEFAULT 'all', -- NEW COLUMN
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_merge_condition CHECK (merge_condition IN ('all', 'any'))
);
```

## Version History

- **Version 1.0.0** (2025-11-11): Initial release of Merge Condition feature

## Support

For issues or questions about this feature:
1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify database migration was successful
4. Contact your system administrator

## Related Documentation

- [Flow Rules Documentation](./CUSTOMER_FEATURE_GUIDE.md)
- [TAT Strategy Guide](./TAT_COMPLETION_STRATEGY_GUIDE.md)
- [Database Audit Report](./DATABASE_AUDIT.md)

---

**Note**: This feature maintains backward compatibility. All existing flow rules will default to "All Steps Complete" behavior.
