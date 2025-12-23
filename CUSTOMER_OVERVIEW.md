# Process Sutra - Workflow Automation Platform

## What is Process Sutra?

Process Sutra is a modern, intelligent workflow automation platform designed to streamline your business processes. It helps organizations automate repetitive tasks, track progress in real-time, and make data-driven decisions to improve operational efficiency.

## Key Features

### 🔄 Visual Workflow Builder
Create sophisticated multi-step workflows using an intuitive drag-and-drop interface. Design process flows that automatically route tasks to the right people at the right time.

### 📋 Dynamic Form Builder
Build custom forms tailored to your business needs without writing code. Collect structured data, validate inputs, and integrate seamlessly with your workflows.

### ✅ Task Management
Assign, track, and manage tasks efficiently. Team members receive real-time notifications and can view their pending assignments in a centralized dashboard.

### 📊 Analytics & Reporting
Gain insights into your processes with comprehensive analytics:
- Track completion rates and turnaround times
- Identify bottlenecks in your workflows
- Monitor team performance with scoring systems
- Generate detailed reports for stakeholders

### ⏱️ TAT (Turn Around Time) Tracking
Set and monitor service level agreements for each task. Get alerted when tasks are approaching deadlines or becoming overdue.

### 👥 User & Organization Management
- Role-based access control (Admin, User roles)
- Multi-organization support
- Secure authentication and user management
- Profile customization

### 🔌 API Integration
Trigger workflows programmatically through REST APIs. Perfect for integrating with external systems, CRM platforms, or custom applications.

### 📧 Communication Add-ons
- Automated email notifications
- Google Drive integration for document storage
- WhatsApp notifications (coming soon)

## Who Can Benefit?

Process Sutra is ideal for:
- **Customer Service Teams**: Track support tickets and customer requests
- **HR Departments**: Manage employee onboarding and approval workflows
- **Operations Teams**: Automate procurement and approval processes
- **Project Managers**: Monitor project milestones and deliverables
- **Any Organization**: Looking to digitize and optimize their business processes

## How It Works

1. **Define Your Process**: Use the visual flow builder to map out your workflow steps
2. **Create Forms**: Build data collection forms for each step
3. **Set Rules**: Configure routing logic, approval hierarchies, and notifications
4. **Launch**: Activate your workflow and start processing tasks
5. **Monitor**: Track performance through real-time analytics and reports
6. **Optimize**: Use insights to continuously improve your processes

## Complete Page-by-Page Feature Guide

### 📊 Analytics Dashboard (Home Page)
**Access**: All Users | **Route**: `/` or `/analytics`

Your central command center for monitoring performance and tracking workflow metrics.

**Overview Tab**:
- **Metric Cards**: Real-time view of total tasks, completed tasks, overdue tasks, on-time rate, and average resolution time
- **Flow Performance Charts**: Compare completion times and on-time rates across different workflow systems
- **Weekly Scoring System**: Gamified performance tracking with user rankings based on task completion
- **Visual Insights**: Line charts, bar charts, and area charts showing task trends over time

**Reporting Tab (Admin Only)**:
- **Advanced Filters**: Filter by system, task name, date range, doer name/email
- **Task Analytics**: View creation trends, completion patterns, and overdue task analysis
- **Doer Performance**: Track individual user productivity and efficiency
- **Export Capabilities**: Download reports for external analysis
- **Time-Series Data**: Visualize workflow patterns over custom time periods

---

### ✅ Tasks Page
**Access**: All Users | **Route**: `/tasks`

Manage your workload and complete assigned tasks efficiently.

**Core Features**:
- **Multiple View Modes**: Toggle between card view and table view for task visualization
- **Advanced Filters**: Filter by status (pending, completed, overdue), system, assignee, priority, date range
- **Search Functionality**: Quick search across task names, order numbers, and flow IDs
- **Task Actions**:
  - View task details and flow data
  - Fill and submit forms
  - Mark tasks as complete with status selection
  - Transfer tasks to other users with reason tracking
  - Export task data to CSV
  - Print task information
  - Refresh task list manually

**Start New Flow**:
- Initiate workflows directly from the Tasks page
- Provide system, order number, description, and initial form data
- Option to notify assignees

**Task Card Information**:
- Task name, status, and priority badges
- Assigned user and creation timestamp
- Order number and flow description
- TAT (Turn Around Time) indicators
- Status-based color coding (green for completed, red for overdue, yellow for pending)
- Embedded flow data viewer

---

### 🔄 Flows Page (Workflow Management)
**Access**: Admin Only | **Route**: `/flows`

Create and manage workflow rules that power your business processes.

**Features**:
- **Flow Rule Management**:
  - Define workflow systems (e.g., "CRM Onboarding", "HR Approval")
  - Create task sequences with conditional routing
  - Set task transitions based on completion status
  - Configure Turn Around Time (TAT) for each task

**TAT Types**:
  - **Day TAT**: Complete within X days
  - **Hour TAT**: Complete within X hours
  - **Before TAT**: Complete before specific hour (24-hour format)
  - **Specify TAT**: Must complete by exact hour each day

**Rule Configuration**:
- Assign tasks to specific users by email
- Attach forms to task steps
- Enable task transfer capability
- Set transfer recipient emails
- Configure merge conditions (all/any) for multi-path flows
- Import/export flow rules via JSON

**Bulk Actions**:
- Start flows with initial form data
- Import existing flow configurations
- Delete individual rules or entire systems
- View complete flow structure

---

### 🎨 Visual Flow Builder
**Access**: Admin Only | **Route**: `/visual-flow-builder`

Design workflows visually with an interactive drag-and-drop interface.

**Interactive Features**:
- **Visual Node Editor**: See your entire workflow as a flowchart
- **Node Types**: Start nodes, task nodes, decision nodes, and end nodes
- **Drag-and-Drop**: Rearrange nodes by dragging
- **Zoom Controls**: Zoom in/out for better visualization
- **System Filter**: View specific workflow systems
- **Node Details**: Click nodes to view/edit task properties
- **Edge Labels**: See transition conditions between tasks
- **Real-time Updates**: Changes reflect immediately in the visual diagram

**Rule Management**:
- Add new rules directly from the visual interface
- Edit existing rules with inline dialogs
- Delete rules with visual confirmation
- Create new workflow systems
- Quick form assignment to tasks

**Color Coding**:
- Start nodes: Blue
- Regular tasks: Green
- Decision points: Yellow
- End nodes: Red
- Completed tasks: Gray

---

### 📝 Form Builder
**Access**: Admin Only | **Route**: `/form-builder`

Design custom data collection forms without coding.

**Form Question Types**:
- **Text Input**: Single-line text fields with placeholders
- **Textarea**: Multi-line text areas for longer responses
- **Dropdown**: Select from predefined options
- **Checkbox**: Multiple selection options
- **Radio Button**: Single selection from options
- **Date Picker**: Calendar-based date selection
- **File Upload**: Document and image uploads (supports Google Drive integration)
- **Table/Multiple Items**: Repeating rows with multiple columns

**Advanced Features**:
- Drag-and-drop question reordering
- Required field validation
- Custom placeholder text
- Option management for select/radio/checkbox fields
- Table column configuration with different data types
- Form preview before publishing
- Form template duplication

**Communication Add-ons**:
- **Email Configuration**: Auto-send emails on form submission with custom templates
- **WhatsApp Integration**: Send notifications via WhatsApp with message templates
- **Template Variables**: Use placeholders like {{response_id}}, {{task_name}}, {{submitter_email}}

**Form Management**:
- Edit existing forms
- Delete forms (with warning if used in flows)
- View all form templates in a list
- Track form usage across workflows

---

### ⚙️ TAT Configuration
**Access**: Admin Only | **Route**: `/tat-config`

Configure global Turn Around Time calculation settings.

**Settings**:
- **Office Hours**: Define start and end time for working hours (e.g., 9 AM - 6 PM)
- **Timezone**: Select organization timezone
- **Weekend Configuration**: 
  - Enable/disable weekend skipping
  - Select which days are weekends (checkboxes for each day)
  - Default: Saturday and Sunday
- **Validation**: Ensures office hours are logical (end after start, minimum 1 hour)

**Impact**:
- Affects TAT calculations across all workflows
- Excludes non-working hours from TAT countdown
- Respects holidays and weekends
- Provides realistic deadline expectations

---

### 👥 User Management
**Access**: Admin Only | **Route**: `/user-management`

Manage user accounts, roles, and access control.

**Features** (Page is structured but implementation uses Organization Settings):
- View all users in the organization
- Add new users with email, name, and role
- Edit user information
- Change user status (active/inactive)
- View user login history
- Track device information
- Monitor password change history
- User activity logs

**Role Management**:
- **Admin**: Full system access, can manage workflows and users
- **User**: Can view and complete assigned tasks only

---

### 🏢 Organization Settings
**Access**: Admin Only | **Route**: `/organization-settings`

Configure your organization profile and manage company details.

**Organization Information**:
- Company name
- Domain
- Address and contact phone
- GST number (for Indian businesses)
- Industry type
- Customer type (B2B, B2C, B2G)
- Business type (Trading, Manufacturing, Wholesaler, Retailer, Service Provider)
- Plan details and user limits
- Organization status

**User Management**:
- Add users to organization
- Assign roles (admin/user)
- View all organization members
- Track user count against plan limits

---

### 👤 Profile Page
**Access**: All Users | **Route**: `/profile`

Manage personal account settings and organization information.

**Tabs**:

**Personal Information**:
- View Firebase authentication details
- Email address (read-only)
- User role badge

**Organization Details** (Admin Only):
- Edit company name, address, phone
- Update GST number
- Change industry and business type
- Modify customer type
- Real-time validation
- Save changes with confirmation

**Google Drive Integration** (Admin Only):
- Connect Google account for file storage
- View connection status
- Manage OAuth tokens
- Configure Drive folder for uploads
- Disconnect and reconnect options

**Notifications**:
- Incomplete organization profile alerts for admins
- Missing Google Drive connection warnings

---

### 📋 Form Responses
**Access**: Admin Only | **Route**: `/form-responses`

View and analyze all form submissions across workflows.

**Features**:
- **Search & Filter**:
  - Search by task name, form ID, submitter, flow ID, order number
  - Filter by specific form template
  - Filter by task name
  - Filter by order number
  - Date range filtering
- **Response Table**:
  - Task name and form ID
  - Submitter email and timestamp
  - Order number and system
  - Flow description
  - Action buttons (View details)
- **Pagination**: Navigate through large response sets (10 per page)
- **Response Details Dialog**:
  - Complete form submission data
  - Formatted JSON view
  - Copy response data
  - Timestamp information
- **Export**: Download filtered responses as CSV

---

### 🗂️ Data Management
**Access**: Admin Only | **Route**: `/data-management`

Export or permanently delete organizational data.

**Data Categories**:

1. **Flow Data**:
   - Export flow instances to CSV
   - Delete all flow execution history
   - Track flow performance over time

2. **Form Submissions**:
   - Export as ZIP with separate CSV per form
   - Delete all form response data
   - Includes all form field values

3. **Task Data**:
   - Export task records to CSV
   - Delete task history permanently
   - Includes assignments and completions

4. **Uploaded Files**:
   - Download all files as ZIP archive
   - Delete all uploaded documents
   - Includes form attachments

5. **User Data**:
   - Export user information to CSV
   - No bulk delete (requires individual removal)

**Safety Features**:
- Confirmation dialogs for deletions
- Type-to-confirm "DELETE" for permanent actions
- Export before delete recommendations
- Loading states during operations

---

### 📊 Usage Analytics
**Access**: Admin Only | **Route**: `/usage`

Monitor system usage, quotas, and operational metrics.

**Dashboard Sections**:

**Flow Metrics**:
- Total flows and monthly count
- Active, completed, and cancelled flows
- Success rate percentage
- Average completion time
- Month-over-month trends

**Form Metrics**:
- Total submissions and monthly count
- Breakdown by form type
- Average submission time
- Submission trends

**Storage Metrics**:
- Total files and storage used (GB)
- File type distribution
- Average file size
- Storage trends and growth

**User Metrics**:
- Total and active users
- Users active today
- Average tasks per user

**Cost Analysis**:
- Current month operational cost
- Cost breakdown (flows, users, forms)
- Projected monthly cost
- Month-over-month comparison

**Performance Indicators**:
- TAT compliance rate
- On-time delivery rate
- Average response time

**Quota Monitoring**:
- User limits (current vs. max)
- Flow limits (current vs. max)
- Storage limits with usage bars
- Visual progress indicators

**Charts**:
- Monthly flow trends
- Storage growth over time
- User activity patterns
- Cost projections

---

### 🧪 Advanced Simulator
**Access**: Admin Only | **Route**: `/advanced-simulator`

Test and optimize workflows with realistic simulations.

**Simulation Settings**:
- Select workflow system to simulate
- Number of flow instances to start
- Simulation speed (minutes per tick)
- Team size (auto-calculated from tasks)
- Cost per hour for ROI analysis

**Peak Hours Configuration**:
- Define peak operation times (HH:mm format)
- Set speed boost percentage during peaks
- Simulate real business hours

**Arrival Patterns**:
- **None**: No new arrivals during simulation
- **Period**: Regular intervals
- **Uniform**: Random within min-max range
- **Normal Distribution**: Statistical arrival patterns
- **Trend Up**: Increasing arrival rate
- **Trend Down**: Decreasing arrival rate

**Working Hours**:
- Set work start and end times
- Enable/disable weekend processing
- Realistic time constraints

**Advanced Options**:
- Fast mode for quick testing
- Ignore working hours for 24/7 simulation
- On-time buffer percentage
- Realistic completion times with variability
- Average completion percentage of TAT

**Real-time Monitoring**:
- Live task status tracking
- Queue visualization
- Timeline charts
- Performance metrics
- Cost calculations
- Bottleneck identification

**Results & Analysis**:
- Completion rates and times
- Resource utilization
- Cost per flow instance
- TAT compliance
- Optimization recommendations

---

### 🔌 API Start Flow
**Access**: Admin Only | **Route**: `/api-startflow`

Configure API integrations for programmatic workflow triggering.

**API Key Management**:
- Create new API keys with names and descriptions
- View all active API keys
- Revoke/delete keys
- Copy keys securely
- Last used timestamps

**Webhook Configuration**:
- **Create Webhooks**: Subscribe to events (flow.started, flow.completed, task.assigned, task.completed, flow.cancelled)
- **Target URLs**: Specify endpoint to receive notifications
- **Secret Keys**: Auto-generate or custom secrets for HMAC verification
- **Active Status**: Enable/disable webhooks
- **Event Filtering**: Choose specific events to receive

**Test Interface**:
- Test API with sample payloads
- Select API key for authentication
- Fill system, order number, and description
- Provide initial form data (JSON)
- Toggle assignee notifications
- View test results and errors
- Copy curl commands

**Webhook Testing**:
- Test webhook endpoints
- Simulate event payloads
- Verify HMAC signatures
- Check endpoint responses

---

### 📚 API Documentation
**Access**: Admin Only | **Route**: `/api-documentation`

Complete reference for ProcessSutra REST API and webhooks.

**Documentation Sections**:

**Start Flow API**:
- Endpoint URL and HTTP method
- Authentication requirements (Organization ID + API Key)
- Request body schema with examples
- Response formats (success and error)
- Status codes and meanings
- Rate limiting information

**Webhooks**:
- Available events and payloads
- HMAC signature verification
- Webhook security best practices
- Retry mechanisms
- Timeout handling

**Authentication**:
- API key generation and management
- Header format (X-Organization-Id, X-API-Key)
- Security considerations
- Token rotation

**Code Examples**:
- cURL commands
- Python examples
- Node.js/JavaScript examples
- PHP examples
- Postman collections

**Interactive Features**:
- Copy code snippets to clipboard
- Real endpoint URLs
- Live API testing interface
- Error handling examples

---

### 💳 Payments (Future Feature)
**Access**: Admin Only | **Route**: `/payments`

Manage billing, subscriptions, and payment methods.

**Planned Features**:
- View current plan details
- Upgrade/downgrade subscriptions
- Payment history
- Invoice downloads
- Payment method management
- Usage-based billing
- Auto-renewal settings

---

## Getting Started

### For End Users
1. **Log In**: Access the platform with your credentials at the landing page
2. **View Tasks**: Navigate to Tasks page to see assigned work
3. **Complete Tasks**: Fill out forms and submit responses
4. **Track Performance**: Monitor your metrics in the Analytics dashboard
5. **Update Profile**: Manage personal settings in the Profile page

### For Administrators
1. **Initial Setup**: Complete organization details in Profile/Organization Settings
2. **Configure TAT**: Set working hours and timezone in TAT Configuration
3. **Create Forms**: Build data collection forms in Form Builder
4. **Design Workflows**: Use Flows or Visual Flow Builder to create process flows
5. **Manage Users**: Add team members in Organization Settings
6. **Monitor System**: Track usage and performance in Analytics and Usage pages
7. **API Integration**: Set up API keys and webhooks for external integrations
8. **Test Workflows**: Use Advanced Simulator to optimize before going live

## Security & Compliance

- Secure authentication with Firebase
- Role-based access control
- Data encryption in transit and at rest
- Audit trails for all actions
- NDA and security policy compliance

## Support & Documentation

- **User Guide**: Comprehensive documentation for all features
- **API Documentation**: Complete API reference for integrations
- **Setup Guides**: Step-by-step configuration instructions
- **Support**: Contact your organization administrator for assistance

## Technology Stack

Built with modern, reliable technologies:
- React & TypeScript for a responsive user interface
- Node.js backend for robust performance
- PostgreSQL database for data integrity
- Real-time notifications and updates

---

**Ready to transform your business processes?**

Process Sutra helps you work smarter, not harder. Automate workflows, eliminate manual tracking, and gain visibility into every aspect of your operations.

For more information, visit our [GitHub repository](https://github.com/jating0000la/Process-Sutra-2026) or contact your system administrator.
