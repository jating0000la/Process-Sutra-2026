# MongoDB Form Data Viewer

A new page in ProcessSutra that allows users to view and export form response data stored in MongoDB.

## Features

### 🔍 Data Viewing
- **Organization-specific**: Only shows data for the user's organization
- **Form filtering**: Filter by specific form templates
- **Date range filtering**: Filter by submission date
- **Search functionality**: Search across task names, submitters, systems, order numbers, and form data
- **Pagination**: Efficient handling of large datasets (50 records per page)

### 📊 Data Export
- **CSV Export**: Export filtered data to CSV format
- **Complete dataset**: Exports all matching records (not just current page)
- **Rich metadata**: Includes task details, form data, and timestamps

### 🎯 Data Structure
The MongoDB collection stores form responses with this structure:
```javascript
{
  _id: ObjectId,
  orgId: string,                 // Organization ID
  flowId: string,               // Flow ID
  taskId: string,               // Task ID
  taskName: string,             // Task name
  formId: string,               // Form template ID
  submittedBy: string,          // User who submitted
  orderNumber?: string|number,   // Order/reference number
  system?: string,              // System name
  flowDescription?: string,     // Flow description
  flowInitiatedBy?: string,     // Who started the flow
  flowInitiatedAt?: Date,       // When flow was started
  formData: Record<string, any>, // Actual form responses
  createdAt: Date               // Submission timestamp
}
```

## Access

### Navigation
- Available in the sidebar as "MongoDB Data" with a "New" badge
- Requires admin privileges
- Located at `/mongo-form-data-viewer`

### API Endpoints
- `GET /api/mongo/form-responses` - Fetch paginated form responses
  - Query parameters: `formId`, `startDate`, `endDate`, `page`, `pageSize`
  - Returns: `{ data: FormResponseDoc[], total: number, page: number, pageSize: number }`

## Usage

1. **Navigate** to the MongoDB Data page from the sidebar
2. **Filter** by form template, date range, or search terms
3. **Browse** paginated results with full form data viewable in expandable rows
4. **Export** to CSV for external analysis

## Technical Implementation

### Backend
- `server/mongo/client.ts` - MongoDB connection and collection management
- `server/storage.ts` - Data access layer with MongoDB operations
- `server/routes.ts` - API endpoint for fetching MongoDB data
- Dual-write: Form responses are stored in both PostgreSQL and MongoDB

### Frontend
- `client/src/pages/mongo-form-data-viewer.tsx` - React component for the viewer
- Uses shadcn/ui components for consistent styling
- Implements client-side search and server-side pagination
- CSV export functionality with proper escaping

### Security
- Organization-scoped data access
- Admin-only access control
- Authenticated API endpoints
- Input validation and sanitization

## Configuration

MongoDB connection is configured via environment variables:
```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=processsutra
```

## Benefits

1. **Dual Storage**: Maintains SQL database benefits while enabling NoSQL analytics
2. **BI Integration**: MongoDB can be connected to Looker Studio, Power BI, etc.
3. **Flexible Queries**: JSON structure allows complex aggregations
4. **Export Ready**: CSV export enables data analysis in Excel/Sheets
5. **Scalable**: MongoDB handles large datasets efficiently

## Future Enhancements

- **Advanced filtering**: Filter by form field values
- **Aggregation views**: Charts and analytics directly in the UI
- **Real-time updates**: WebSocket-based live data updates
- **Bulk operations**: Edit or delete multiple records
- **Custom export formats**: JSON, Excel, PDF reports
