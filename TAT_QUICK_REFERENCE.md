# TAT Calculator - Quick Reference Card

## 🚀 Quick Start

```typescript
import { calculateTAT, TATConfig } from './server/tatCalculator';

// Use default config (9 AM - 5 PM, 8 hours, skip weekends)
const deadline = calculateTAT(new Date(), 2, 'daytat');

// Or specify custom config
const config: TATConfig = {
  officeStartHour: 9,
  officeEndHour: 17,
  timezone: 'Asia/Kolkata',
  skipWeekends: true
};
const deadline = calculateTAT(new Date(), 6, 'hourtat', config);
```

---

## 📚 TAT Types

| Type | Description | Example | Best For |
|------|-------------|---------|----------|
| `daytat` | Business days | `2 days` | Multi-day tasks (>8 hours) |
| `hourtat` | Working hours | `6 hours` | Same/next day tasks (≤8 hours) |
| `specifytat` | Specific time | `14` (2 PM) | Fixed deadline time |
| `beforetat` | Days before | `2 days` | Backward calculation |

---

## 🎯 Common Scenarios

### Same Day Task (3 hours)
```typescript
const deadline = calculateTAT(new Date(), 3, 'hourtat');
// Monday 10:00 AM → Monday 1:00 PM
```

### Next Day Task (8 hours = 1 work day)
```typescript
const deadline = calculateTAT(new Date(), 8, 'hourtat');
// OR
const deadline = calculateTAT(new Date(), 1, 'daytat');
// Monday 9:00 AM → Tuesday 9:00 AM
```

### Multi-Day Task (3 days)
```typescript
const deadline = calculateTAT(new Date(), 3, 'daytat');
// Monday 10:00 AM → Thursday 10:00 AM
```

### Specific Time Deadline (10 AM tomorrow)
```typescript
const deadline = calculateTAT(new Date(), 10, 'specifytat');
// Wednesday 3:00 PM → Thursday 10:00 AM
```

### Task Due Before Event (2 days before)
```typescript
const deadline = calculateTAT(eventDate, 2, 'beforetat');
// Event: Tuesday → Task Due: Friday (previous week)
```

---

## ⚠️ Important Rules

### Hour TAT
- ✅ Maximum: 8 hours recommended (1 work day)
- ✅ Use for short-term tasks
- ⚠️ For >8 hours, use Day TAT instead

### Day TAT
- ✅ Preserves original time (2:30 PM → 2:30 PM)
- ✅ Skips weekends automatically
- ✅ Ideal for multi-day planning

### Office Hours
- ⏰ Start: 9:00 AM
- ⏰ End: 5:00 PM (17:00)
- ⏰ Duration: 8 hours per day
- 📅 Weekends: Saturday & Sunday (skipped)

---

## 🔄 Weekend Handling

| Start Day | TAT | End Day |
|-----------|-----|---------|
| Friday 2 PM | +2 days | **Tuesday** 2 PM |
| Friday 5 PM | +10 hours | **Tuesday** 11 AM |
| Saturday | +1 day | **Monday** (same time) |
| Sunday | +3 hours | **Monday** 12 PM |

---

## 💡 Best Practices

### DO ✅
```typescript
// Use Day TAT for multi-day tasks
const deadline = calculateTAT(start, 3, 'daytat');

// Use Hour TAT for same-day tasks
const deadline = calculateTAT(start, 4, 'hourtat');

// Check for organization config
const config = await storage.getTATConfig(orgId);
const deadline = calculateTAT(start, 2, 'daytat', config || defaultConfig);
```

### DON'T ❌
```typescript
// Don't use Hour TAT for >8 hours
const deadline = calculateTAT(start, 20, 'hourtat'); // ❌ Use daytat

// Don't forget to handle config fallback
const config = await storage.getTATConfig(orgId);
const deadline = calculateTAT(start, 2, 'daytat', config); // ❌ No fallback
```

---

## 🧪 Testing Examples

### Test Hour TAT
```typescript
// Thursday 4 PM + 5 hours → Friday 1 PM
const start = new Date('2025-10-16T16:00:00+05:30');
const result = hourTAT(start, 5, config);
console.log(result); // Friday 13:00
```

### Test Day TAT
```typescript
// Friday 2:30 PM + 2 days → Tuesday 2:30 PM
const start = new Date('2025-10-17T14:30:00+05:30');
const result = dayTAT(start, 2, config);
console.log(result); // Tuesday 14:30 (weekend skipped)
```

### Test Specify TAT
```typescript
// Friday 11 AM, specify 2 PM → Monday 2 PM
const start = new Date('2025-10-17T11:00:00+05:30');
const result = specifyTAT(start, 14, config);
console.log(result); // Monday 14:00
```

---

## 🔍 Debugging Tips

### Check Current Config
```typescript
console.log('[TAT] Config:', config);
console.log('[TAT] Office Hours:', config.officeStartHour, '-', config.officeEndHour);
console.log('[TAT] Skip Weekends:', config.skipWeekends);
```

### Log Calculations
```typescript
const start = new Date();
console.log('[TAT] Start:', start.toISOString());
const result = calculateTAT(start, 2, 'daytat', config);
console.log('[TAT] End:', result.toISOString());
console.log('[TAT] Duration (hours):', (result - start) / (1000 * 60 * 60));
```

### Validate Output
```typescript
const result = calculateTAT(start, tat, tatType, config);

// Check if weekend
const isWeekend = result.getDay() === 0 || result.getDay() === 6;
console.assert(!isWeekend, 'Result should not be on weekend');

// Check if within office hours
const hour = result.getHours();
console.assert(hour >= 9 && hour < 17, 'Result should be within office hours');
```

---

## 📊 Equivalence Table

| Hour TAT | Day TAT | Same Result? |
|----------|---------|--------------|
| 8 hours | 1 day | ✅ YES |
| 16 hours | 2 days | ✅ YES |
| 24 hours | 3 days | ✅ YES |
| 40 hours | 5 days | ✅ YES |

---

## 🚨 Common Errors

### Error: "Invalid timestamp"
```typescript
// ❌ Wrong
const deadline = calculateTAT("2025-10-15", 2, 'daytat');

// ✅ Correct
const deadline = calculateTAT(new Date("2025-10-15"), 2, 'daytat');
```

### Error: "TAT cannot be negative"
```typescript
// ❌ Wrong
const deadline = calculateTAT(new Date(), -2, 'daytat');

// ✅ Correct - Use beforetat
const deadline = calculateTAT(new Date(), 2, 'beforetat');
```

### Error: "TAT cannot exceed 365 days"
```typescript
// ❌ Wrong
const deadline = calculateTAT(new Date(), 500, 'daytat');

// ✅ Correct
const deadline = calculateTAT(new Date(), 365, 'daytat');
```

---

## 📞 Support

### Documentation
- `TAT_IMPLEMENTATION_SUMMARY.md` - Full implementation guide
- `TAT_CALCULATOR_8HOUR_TEST_RESULTS.md` - Test results & usage
- `TAT_CALCULATOR_RESULTS_TABLE.md` - Input/output tables

### Test Suite
- Run: `npx tsx test-tat-calculator.ts`
- Location: `test-tat-calculator.ts`
- Coverage: 18 test scenarios

---

## 🎓 Learning Resources

### Example Flows
1. **Simple Flow:** Start → Task A (4 hours) → Task B (1 day) → End
2. **Complex Flow:** Start → Parallel Tasks (8 hours each) → Merge → Final (2 days)
3. **Weekend Flow:** Friday Start → Weekend Skip → Monday Continue

### API Integration
```typescript
// In routes.ts
const tatConfiguration = await storage.getTATConfig(user.organizationId);
const config: TATConfig = tatConfiguration || { 
  officeStartHour: 9, 
  officeEndHour: 17,
  timezone: "Asia/Kolkata",
  skipWeekends: true
};
const plannedTime = calculateTAT(new Date(), rule.tat, rule.tatType, config);
```

---

**Version:** 2.0  
**Last Updated:** October 15, 2025  
**Configuration:** 8-hour workday (9 AM - 5 PM)
