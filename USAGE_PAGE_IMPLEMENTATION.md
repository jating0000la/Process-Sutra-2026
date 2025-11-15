# 📊 Usage Statistics Page - Implementation Guide

## Overview
The Usage Statistics page provides comprehensive insights into organization-wide platform usage, including flow executions, form submissions, storage metrics, cost analysis, and performance indicators.

## 🎯 Features Implemented

### 1. **Flow Execution Metrics** 🔄
- **Total Flow Runs**: All-time and current month flow executions
- **Active Flows**: Currently running workflows
- **Completed Flows**: Successfully finished workflows
- **Cancelled Flows**: Terminated workflows
- **Success Rate**: Percentage of completed vs total flows
- **Average Completion Time**: Days taken to complete flows
- **Flow Distribution by System**: Breakdown across Order FMS, Dispatch FMS, Order Manufacturer, etc.
- **Trend Analysis**: Month-over-month growth percentage

### 2. **Form Submission Metrics** 📝
- **Total Submissions**: All-time and current month
- **Submissions by Form Type**: Breakdown by form ID (feedback, PO, rates, jobcard, etc.)
- **Top 10 Most Used Forms**: Bar chart visualization
- **Trend Analysis**: Comparison with previous month
- **Average Submission Time**: (Placeholder for future enhancement)

### 3. **Storage & Data Usage** 💾
- **Total File Uploads**: Number of files stored
- **Storage Used**: In GB/MB with visual progress bar
- **Storage by File Type**: Distribution (images, PDFs, documents, etc.)
- **Average File Size**: Calculated from total storage
- **Storage Quota Tracking**: Used vs available storage
- **Growth Trend**: Month-over-month storage increase

### 4. **User Activity Metrics** 👥
- **Total Users**: All organization users
- **Active Users**: Users with 'active' status
- **Active Today**: Users logged in within last 10 minutes
- **Average Tasks per User**: Productivity metric
- **User Engagement Rate**: Percentage calculation

### 5. **Cost/Billing Metrics** 💰
- **Current Month Cost**: Calculated using usage-based pricing
- **Cost Breakdown**:
  - Flow Executions: ₹5 per flow
  - Active Users: ₹100 per user/month
  - Form Submissions: ₹2 per submission
- **Projected End of Month Cost**: Based on current usage patterns
- **Month-over-Month Comparison**: % increase/decrease
- **Visual Cost Cards**: Color-coded by category

### 6. **Performance Metrics** ⚡
- **TAT Compliance Rate**: Percentage of tasks completed within planned time
- **On-Time Delivery Rate**: Tasks finished before or on deadline
- **Flow Success Rate**: Completed vs cancelled flows
- **Average Response Time**: Days taken to complete tasks

### 7. **Quota & Limits** ⚠️
- **Max Users vs Current**: Visual progress bar
- **Storage Quota vs Used**: GB comparison with percentage
- **API Rate Limit Usage**: (Placeholder for future)
- **Capacity Alerts**: Visual warnings when approaching limits

### 8. **Trend Analysis** 📈
- **30-Day Usage Trends**: Area chart showing daily flows and forms
- **Flow Distribution**: Pie chart by system
- **Top Forms Bar Chart**: Most submitted forms
- **Performance Score Visualization**: Progress bars for key metrics

---

## 🏗️ Technical Architecture

### Frontend Components
**Location**: `client/src/pages/usage.tsx`

**Key Libraries**:
- React Query for data fetching
- Recharts for data visualization
- Lucide React for icons
- Shadcn/ui components

**State Management**:
- `dateRange`: Filter for week/month/quarter
- Real-time data refresh with 1-minute stale time

### Backend API Endpoints

#### 1. `/api/usage/summary`
**Method**: GET  
**Auth**: Admin only  
**Query Params**: `dateRange` (week/month/quarter)

**Response Schema**:
```typescript
{
  flows: {
    total: number,
    thisMonth: number,
    active: number,
    completed: number,
    cancelled: number,
    successRate: number,
    avgCompletionTime: number,
    trend: number
  },
  forms: {
    total: number,
    thisMonth: number,
    byFormType: Record<string, number>,
    avgSubmissionTime: number,
    trend: number
  },
  storage: {
    totalFiles: number,
    totalBytes: number,
    totalGB: number,
    byFileType: Record<string, number>,
    avgFileSize: number,
    trend: number
  },
  users: {
    total: number,
    active: number,
    activeToday: number,
    avgTasksPerUser: number
  },
  cost: {
    currentMonth: number,
    flowCost: number,
    userCost: number,
    formCost: number,
    projected: number,
    comparison: number
  },
  performance: {
    tatCompliance: number,
    onTimeRate: number,
    avgResponseTime: number
  },
  quotas: {
    maxUsers: number,
    currentUsers: number,
    storageLimit: number,
    storageUsed: number
  }
}
```

#### 2. `/api/usage/trends`
**Method**: GET  
**Auth**: Admin only  
**Query Params**: `dateRange`

**Response Schema**:
```typescript
{
  daily: Array<{
    date: string,
    flows: number,
    forms: number,
    storage: number
  }>,
  flowsBySystem: Array<{
    system: string,
    count: number,
    percentage: number
  }>,
  topForms: Array<{
    formId: string,
    count: number
  }>
}
```

### Database Queries

**PostgreSQL**:
- Tasks aggregation by flow, status, dates
- Form responses counting and grouping
- User statistics (active, inactive, login times)
- Organization quotas from organizations table

**MongoDB (GridFS)**:
- File count by organization
- Total storage bytes calculation
- File type distribution
- Average file size computation

---

## 🎨 UI/UX Features

### Tab Navigation
1. **Overview**: High-level dashboard with all key metrics
2. **Flows**: Detailed flow execution statistics
3. **Storage**: File storage breakdown and quotas
4. **Cost Analysis**: Detailed cost breakdown and projections

### Visual Elements
- **Color-coded Cards**: Blue (flows), Green (forms), Purple (storage), Amber (cost)
- **Trend Indicators**: Up/down arrows with percentages
- **Progress Bars**: For quotas and performance metrics
- **Charts**: Area charts, pie charts, bar charts
- **Responsive Layout**: Grid system adapting to screen size

### Interactions
- **Date Range Filter**: Dropdown for week/month/quarter
- **Export Report**: Download button (placeholder)
- **Hover Effects**: Card shadows and tooltips
- **Real-time Updates**: Auto-refresh every minute

---

## 🔐 Security & Access Control

- **Admin-Only Access**: Only users with `role === 'admin'` can view
- **Organization Isolation**: Data filtered by `organizationId`
- **Rate Limiting**: Analytics limiter applied to prevent abuse
- **Authentication Required**: `isAuthenticated` middleware
- **Audit Logging**: All data access logged for compliance

---

## 📊 Pricing Configuration

**Current Rates** (configurable in code):
```typescript
const flowRate = 5;      // ₹5 per flow execution
const userRate = 100;    // ₹100 per active user/month
const formRate = 2;      // ₹2 per form submission
```

**Cost Formula**:
```
Total Cost = (Flow Count × ₹5) + (Active Users × ₹100) + (Form Submissions × ₹2)
```

---

## 🚀 Future Enhancements

### Planned Features
1. **Real-time Cost Tracking**: Live cost updates as usage occurs
2. **Custom Date Range Picker**: Select specific start/end dates
3. **Export Reports**: PDF/CSV download functionality
4. **Email Reports**: Scheduled monthly usage reports
5. **Budget Alerts**: Notifications when approaching cost thresholds
6. **Comparison Views**: Side-by-side month comparisons
7. **API Usage Tracking**: Webhook call statistics
8. **Storage Optimization Tips**: Suggestions for reducing storage
9. **User Activity Heatmap**: Busiest days/hours visualization
10. **Predictive Analytics**: Machine learning for usage forecasting

### Technical Improvements
1. **Caching Strategy**: Redis cache for frequently accessed metrics
2. **Background Jobs**: Pre-calculate daily statistics
3. **GraphQL API**: More flexible data querying
4. **WebSocket Updates**: Real-time dashboard updates
5. **Data Archival**: Historical data compression
6. **Performance Optimization**: Indexed queries for faster response

---

## 📝 Usage Instructions

### For Administrators

1. **Navigate to Usage Page**:
   - Click on Settings → Usage Statistics
   - Or directly visit `/usage` route

2. **View Overview Dashboard**:
   - See all key metrics at a glance
   - Check trend indicators (↑↓)
   - Monitor quota usage

3. **Explore Detailed Tabs**:
   - **Flows**: Analyze workflow execution patterns
   - **Storage**: Monitor file storage consumption
   - **Cost**: Review billing breakdown and projections

4. **Filter by Date Range**:
   - Use dropdown to select: Last 7 Days, This Month, or Last 3 Months
   - Data updates automatically

5. **Export Reports** (Coming Soon):
   - Click Export Report button
   - Select format (PDF/CSV)
   - Download comprehensive usage report

### For Developers

**To Customize Pricing**:
```typescript
// In server/routes.ts - /api/usage/summary endpoint
const flowRate = 10;     // Change to ₹10 per flow
const userRate = 200;    // Change to ₹200 per user
const formRate = 5;      // Change to ₹5 per form
```

**To Add New Metrics**:
1. Update `UsageSummary` interface in `usage.tsx`
2. Modify `/api/usage/summary` endpoint to include new data
3. Add UI components in the appropriate tab

**To Customize Charts**:
- Use Recharts components in `usage.tsx`
- Configure colors in `COLORS` array
- Adjust chart dimensions in `ResponsiveContainer`

---

## 🐛 Troubleshooting

### Common Issues

**1. "Access Denied" Message**
- **Cause**: User is not an admin
- **Solution**: Contact organization admin to grant admin privileges

**2. Loading Forever**
- **Cause**: API endpoint timeout or database connection issue
- **Solution**: Check server logs, verify MongoDB connection

**3. Missing Storage Data**
- **Cause**: MongoDB GridFS not configured
- **Solution**: Ensure `MONGODB_URI` and `MONGODB_DB` env vars are set

**4. Incorrect Cost Calculations**
- **Cause**: Pricing rates not configured
- **Solution**: Update rate constants in `/api/usage/summary`

**5. No Data Showing**
- **Cause**: No tasks/forms created yet in organization
- **Solution**: Create some flows and forms first

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Load page as admin user
- [ ] Verify all metric cards display correctly
- [ ] Check trend indicators (↑↓) show proper direction
- [ ] Test date range filter (week/month/quarter)
- [ ] Verify all charts render properly
- [ ] Confirm tab switching works (Overview/Flows/Storage/Cost)
- [ ] Check progress bars for quotas
- [ ] Verify cost calculations are accurate
- [ ] Test on different screen sizes (responsive)
- [ ] Confirm non-admin users see "Access Denied"

### API Testing
```bash
# Test summary endpoint
curl -X GET http://localhost:5000/api/usage/summary \
  -H "Cookie: session=YOUR_SESSION" \
  -H "Content-Type: application/json"

# Test trends endpoint
curl -X GET http://localhost:5000/api/usage/trends?dateRange=month \
  -H "Cookie: session=YOUR_SESSION" \
  -H "Content-Type: application/json"
```

---

## 📚 Related Documentation

- **Analytics Dashboard**: See `client/src/pages/analytics.tsx` for similar patterns
- **Super Admin Stats**: See `/api/super-admin/system-statistics` for system-wide metrics
- **Storage Integration**: See `server/mongo/gridfs.ts` for file management
- **TAT Calculator**: See `server/tatCalculator.ts` for timing calculations
- **Multi-Organization**: See `MULTI_ORGANIZATION_AUDIT_REPORT.md` for isolation details

---

## 🎓 Best Practices

1. **Performance**: Use caching for expensive calculations
2. **Security**: Always validate organizationId in queries
3. **UX**: Show loading states and empty states
4. **Accessibility**: Use proper ARIA labels and keyboard navigation
5. **Error Handling**: Display user-friendly error messages
6. **Data Privacy**: Never expose sensitive user information
7. **Scalability**: Consider pagination for large datasets

---

## 📞 Support

For issues or questions:
- Check server logs: `/var/log/process-sutra/`
- Review audit reports: See `*_AUDIT_REPORT.md` files
- Contact: [Your support contact]

---

**Last Updated**: November 15, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
