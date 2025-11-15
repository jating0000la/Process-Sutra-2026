# 🚀 Usage Page - Quick Start Guide

## ✅ What's Been Built

A comprehensive **Usage Statistics Dashboard** with:

### 📊 Key Features
1. **Flow Execution Tracking** - Total runs, active flows, success rates
2. **Form Submission Analytics** - Submissions by type, trends
3. **Storage Metrics** - File uploads, storage used (GB), file types
4. **Cost Analysis** - Usage-based pricing breakdown (₹ flows + users + forms)
5. **Performance Indicators** - TAT compliance, on-time rates
6. **Quota Monitoring** - User limits, storage limits with progress bars
7. **Visual Charts** - Area charts, pie charts, bar graphs
8. **Trend Analysis** - 30-day historical data

---

## 🎯 Access Instructions

### For Users:
1. **Login** as an admin user
2. Navigate to **Settings** → **Usage Statistics**
3. Or directly visit: `http://your-domain/usage`

### Admin-Only Feature:
- Only users with `role === 'admin'` can access
- Non-admins see "Access Denied" message

---

## 📱 Page Layout

```
┌─────────────────────────────────────────┐
│  Header: Usage Statistics                │
│  [Date Filter ▼] [Export Report]        │
├─────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ Flows  │ │ Forms  │ │Storage │     │
│  │ 1,245  │ │  453   │ │ 2.4 GB │     │
│  └────────┘ └────────┘ └────────┘     │
├─────────────────────────────────────────┤
│  📊 Tabs:                                │
│  [Overview] [Flows] [Storage] [Cost]    │
│                                          │
│  • Usage Trends Chart (30 days)         │
│  • Performance Metrics                   │
│  • Flow Distribution (Pie Chart)         │
│  • Cost Breakdown                        │
└─────────────────────────────────────────┘
```

---

## 🔧 API Endpoints

### 1. Summary Endpoint
```
GET /api/usage/summary?dateRange=month
```
Returns: All metrics (flows, forms, storage, users, cost, performance)

### 2. Trends Endpoint
```
GET /api/usage/trends?dateRange=month
```
Returns: Daily data, system breakdown, top forms

---

## 💰 Cost Calculation

**Current Pricing** (configurable):
- **Flows**: ₹5 per execution
- **Users**: ₹100 per active user/month
- **Forms**: ₹2 per submission

**Formula**:
```
Total = (Flows × ₹5) + (Users × ₹100) + (Forms × ₹2)
```

**Example**:
- 100 flows = ₹500
- 10 active users = ₹1,000
- 200 forms = ₹400
- **Total**: ₹1,900/month

---

## 🎨 Visual Features

### Metric Cards
- **Blue**: Flow executions 🔄
- **Green**: Form submissions 📝
- **Purple**: Storage usage 💾
- **Amber**: Cost estimates 💰

### Trend Indicators
- ↑ Green: Increasing (positive)
- ↓ Red: Decreasing (negative)
- Shows % change from previous month

### Charts
- **Area Chart**: 30-day usage trends
- **Pie Chart**: Flow distribution by system
- **Bar Chart**: Top 10 forms
- **Progress Bars**: Quota usage

---

## 📋 Files Modified/Created

### Frontend
- ✅ `client/src/pages/usage.tsx` - Complete page implementation

### Backend
- ✅ `server/routes.ts` - Added `/api/usage/summary` and `/api/usage/trends`
- ✅ `server/mongo/gridfs.ts` - Added `getStorageStats()` function

### Documentation
- ✅ `USAGE_PAGE_IMPLEMENTATION.md` - Full technical guide
- ✅ `USAGE_PAGE_QUICK_START.md` - This file

---

## 🧪 Testing

### Quick Test Steps
1. Login as admin
2. Go to `/usage` page
3. Verify all cards show data
4. Check charts render
5. Switch tabs (Overview → Flows → Storage → Cost)
6. Change date range filter
7. Verify trend indicators show ↑↓

### Expected Data
- If organization is new: All zeros (normal)
- If has flows: Should show counts and trends
- Storage: Shows files uploaded via forms
- Cost: Calculated based on actual usage

---

## 🎯 Next Steps

### Immediate Actions
1. **Test the page** with your admin account
2. **Review cost rates** - adjust if needed in `server/routes.ts`
3. **Check MongoDB connection** for storage stats
4. **Verify data accuracy** against database

### Future Enhancements
- [ ] Export to PDF/CSV functionality
- [ ] Email monthly reports
- [ ] Budget alerts and notifications
- [ ] Custom date range picker
- [ ] API usage tracking
- [ ] Predictive cost forecasting
- [ ] User activity heatmaps

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Access Denied" | Must be admin user |
| No data showing | Create some flows/forms first |
| Storage shows 0 | Check MongoDB GridFS connection |
| Cost seems wrong | Verify pricing rates in code |
| Charts not loading | Check browser console for errors |

---

## 📞 Quick Reference

### Key Metrics Explained

**Flow Success Rate**: `(Completed Flows / Total Flows) × 100`

**TAT Compliance**: `(On-Time Tasks / Completed Tasks) × 100`

**Storage Used**: Total bytes from MongoDB GridFS

**Active Users**: Users with `status='active'`

**Projected Cost**: `(Current Cost / Days Elapsed) × Days in Month`

---

## 🎓 For Developers

### To Customize Pricing:
Edit in `server/routes.ts` → `/api/usage/summary`:
```typescript
const flowRate = 5;    // ₹ per flow
const userRate = 100;  // ₹ per user/month
const formRate = 2;    // ₹ per form
```

### To Add New Metrics:
1. Update `UsageSummary` interface
2. Modify API endpoint response
3. Add UI component in appropriate tab

### To Change Chart Colors:
Edit `COLORS` array in `usage.tsx`:
```typescript
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', ...];
```

---

## ✨ Key Benefits

✅ **Complete Visibility**: See all usage metrics in one place  
✅ **Cost Control**: Track and project monthly expenses  
✅ **Performance Monitoring**: Identify bottlenecks and inefficiencies  
✅ **Data-Driven Decisions**: Make informed choices about resource allocation  
✅ **Quota Management**: Avoid exceeding plan limits  
✅ **Trend Analysis**: Understand growth patterns over time  

---

**Status**: ✅ **READY TO USE**  
**Access**: Admin users only  
**Route**: `/usage`  
**Created**: November 15, 2025
