# Process Sutra - Complete User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Pages](#user-pages)
4. [Admin Pages](#admin-pages)
5. [Common Tasks](#common-tasks)
6. [Tips & Best Practices](#tips--best-practices)

---

## Introduction

Process Sutra is a comprehensive workflow management system that helps organizations automate and track business processes. The platform enables you to:
- Create and manage dynamic workflows
- Build custom forms for data collection
- Track tasks and monitor performance
- Analyze workflow efficiency with detailed analytics
- Manage users and organizational settings

### User Roles

**Regular Users:**
- View and complete assigned tasks
- Submit forms
- View personal analytics
- Manage profile settings

**Administrators:**
- Full access to all user features
- Create and manage workflows (flows)
- Build and edit forms
- Configure TAT (Turn Around Time) settings
- Manage users and organization settings
- Access advanced analytics and reporting
- API access and integration capabilities

---

## Getting Started

### First Login

1. **Access the Platform**: Navigate to your organization's Process Sutra URL
2. **Sign In**: Enter your credentials on the landing page
3. **First-Time Setup** (Admins only):
   - Complete organization details
   - Configure Google Drive integration (if needed)
   - Set up initial workflows and forms

### Navigation

The application uses a consistent layout:
- **Sidebar**: Main navigation menu on the left
- **Header**: Current page title and breadcrumbs at the top
- **Notification Bell**: Real-time notifications in the header
- **Profile Menu**: Access profile settings and logout

---

## User Pages

### 1. Analytics / Dashboard (Home)

**Path**: `/` or `/analytics`

**Purpose**: Your main dashboard showing performance metrics and insights.

#### Features:

**Overview Tab**
- **Key Metrics Cards**:
  - Total Tasks: All tasks in the system
  - Completed Tasks: Successfully finished tasks
  - Overdue Tasks: Tasks past their TAT deadline
  - On-Time Rate: Percentage of tasks completed within TAT
  - Average Resolution Time: Mean time to complete tasks

- **Flow Performance**:
  - View performance by workflow system
  - Compare average completion times
  - Monitor on-time delivery rates

- **Weekly Scoring**:
  - Personal performance rankings
  - Points based on task completion
  - Comparison with team members

**Reporting Tab** (Admin Only)
- Filter reports by:
  - System/Workflow name
  - Task name
  - Date range
- View detailed metrics:
  - Task creation trends
  - Completion patterns
  - Overdue task analysis
- Time-series charts showing task flow over time
- Export reports for external analysis

**Doer Performance Tab** (Admin Only)
- Filter by date range and user details
- View individual user statistics:
  - Tasks assigned vs. completed
  - Average completion time
  - On-time delivery percentage
  - Task distribution
- Performance comparison across team members

#### How to Use:
1. Default view shows your personal metrics (users) or organization-wide metrics (admins)
2. Use date filters to analyze specific time periods
3. Click on metric cards to drill down into details
4. Switch between tabs using the tab menu
5. Export data using the download button (admin only)

---

### 2. Tasks

**Path**: `/tasks`

**Purpose**: View, manage, and complete your assigned tasks.

#### Features:

**View Modes**
- **Table View**: Detailed list with all task information
- **Card View**: Visual cards for quick overview

**Task Information Displayed**
- Order Number: Unique identifier for the workflow instance
- Task Name: Current step in the workflow
- System: Which workflow this belongs to
- Status: Current state (Pending, In Progress, Completed, Overdue)
- Assigned To: Task owner
- TAT (Turn Around Time): Deadline
- Priority: Importance level
- Form Data: Associated information

**Filters & Search**
- **Status Filter**: All, Pending, In Progress, Completed, Overdue
- **System Filter**: Filter by workflow type
- **Assignee Filter**: See tasks by user
- **Priority Filter**: High, Medium, Low
- **Date Filter**: Today, This Week, This Month, All Time
- **Search Bar**: Search by order number, description, or task name

**Actions on Tasks**

1. **View Task Details**:
   - Click eye icon or task row
   - See complete task information
   - View task history and flow data

2. **Complete Task**:
   - Click "Complete" button
   - Fill out required form (if any)
   - Select completion status (if multiple options)
   - Task automatically moves to next step

3. **Transfer Task** (if enabled):
   - Click transfer icon
   - Enter recipient email
   - Provide transfer reason
   - Task reassigns to new user

4. **View Flow Data**:
   - Click data icon
   - See all form submissions in the workflow
   - Track workflow progress
   - View historical data

5. **Start New Flow** (Admin):
   - Click "+ Start New Flow" button
   - Select system/workflow
   - Enter order number (unique ID)
   - Provide description
   - Optionally add initial form data
   - Submit to create first task

#### How to Use:

**For Regular Users:**
1. Open Tasks page from sidebar
2. Filter to show only your tasks (assignee filter)
3. Click on a pending task to view details
4. If form is required, click "Fill Form"
5. Complete all required fields
6. Submit form to move task forward
7. Task automatically routes to next person in workflow

**For Administrators:**
1. View all tasks across organization
2. Use filters to find specific tasks
3. Start new workflow instances
4. Monitor task completion rates
5. Intervene on overdue or stuck tasks
6. Export task data for analysis
7. Refresh view to see real-time updates

**Task Completion Flow:**
```
1. Receive task notification
2. Open Tasks page
3. Find your pending task
4. Click "Complete" or form icon
5. Fill required information
6. Select completion status (if applicable)
7. Submit form
8. Task moves to next step automatically
9. Next assignee receives notification
```

---

### 3. Profile

**Path**: `/profile`

**Purpose**: Manage your personal information and account settings.

#### Features:
- View current profile information
- Update email address
- Change display name
- View assigned role
- See organization affiliation
- Access account activity

#### How to Use:
1. Click on profile icon or menu
2. Navigate to Profile page
3. Edit desired fields
4. Save changes
5. Changes take effect immediately

---

## Admin Pages

### 4. Flows (Workflow Management)

**Path**: `/flows` (Admin Only)

**Purpose**: Create and manage workflow rules that define how tasks move through your organization.

#### Understanding Flows:

A **Flow** is a series of connected tasks that define a business process. Each flow consists of:
- **System**: The workflow name (e.g., "Order Processing", "Customer Onboarding")
- **Rules**: Definitions of how tasks transition from one step to another

#### Flow Rule Components:

1. **Current Task**: The starting task (use "__start__" for beginning)
2. **Status**: Completion status that triggers this rule
3. **Next Task**: Where the workflow goes after completion
4. **TAT (Turn Around Time)**: Time allowed for completion
   - Day TAT: Number of working days
   - Hour TAT: Number of hours
   - Before TAT: Complete before specific hour (24-hour format)
   - Specify TAT: Complete by specific hour today (0-23)
5. **Doer**: Person responsible (name)
6. **Email**: Assignee's email address
7. **Form**: Optional form to collect data at this step
8. **Transferable**: Whether task can be reassigned
9. **Transfer To Emails**: Allowed transfer recipients
10. **Merge Condition**: For tasks with multiple predecessors
    - All: Wait for all incoming tasks
    - Any: Proceed when any incoming task completes

#### Features:

**View All Rules**
- Table showing all workflow rules
- Filter by system
- Search by task name
- Color-coded by system

**Create New Rule**
1. Click "+ New Flow Rule"
2. Fill in all fields:
   - Select or create system name
   - Choose current task (or __start__)
   - Enter status that triggers transition
   - Define next task name
   - Set TAT and type
   - Assign to user (select from dropdown)
   - Optionally attach form
   - Configure transfer settings
   - Set merge condition if needed
3. Click Save
4. Rule becomes active immediately

**Edit Existing Rule**
1. Click edit icon on rule row
2. Modify any fields
3. Save changes
4. Active workflows use updated rules

**Delete Rule**
1. Click delete icon
2. Confirm deletion
3. Rule removed from system
4. Existing tasks continue with old rule

**Import/Export Rules**
- Export: Download all rules as JSON
- Import: Upload JSON file to bulk create rules
- Useful for backups and migrations

**Start New Workflow Instance**
- Click "Start New Flow"
- Select system
- Enter unique order number
- Provide description
- Add initial data (optional)
- First task created and assigned

#### How to Use:

**Creating a Simple Workflow (Example: Document Approval)**

```
Rule 1: Start → Draft Document
- Current Task: __start__
- Status: Start
- Next Task: Draft Document
- TAT: 2 days
- Doer: John Doe
- Email: john@company.com
- Form: document-draft-form

Rule 2: Draft Document → Review
- Current Task: Draft Document
- Status: Done
- Next Task: Review Document
- TAT: 1 day
- Doer: Jane Smith
- Email: jane@company.com
- Form: review-form

Rule 3: Review → Final Approval
- Current Task: Review Document
- Status: Approved
- Next Task: Final Approval
- TAT: 4 hours
- Doer: Manager Name
- Email: manager@company.com

Rule 4: Review → Revise (rejection path)
- Current Task: Review Document
- Status: Rejected
- Next Task: Draft Document
- TAT: 2 days
- Doer: John Doe
- Email: john@company.com
```

**Best Practices:**
- Use clear, descriptive task names
- Set realistic TAT times
- Always assign to valid email addresses
- Use forms to collect structured data
- Enable transfers for flexibility
- Test workflows before production use
- Document your workflow logic
- Use consistent naming conventions

---

### 5. Form Builder

**Path**: `/form-builder` (Admin Only)

**Purpose**: Create custom forms to collect data at each workflow step.

#### Features:

**Form Types Available:**

1. **Text Input**: Single-line text
   - Use for: Names, IDs, short answers
   - Options: Placeholder text, required field

2. **Textarea**: Multi-line text
   - Use for: Descriptions, comments, long answers
   - Options: Rows, required field

3. **Dropdown (Select)**: Single choice from list
   - Use for: Status, category, predefined options
   - Options: Add multiple options, required field

4. **Checkbox**: Multiple selections
   - Use for: Features, permissions, multi-select
   - Options: Multiple values, required field

5. **Radio Button**: Single choice (displayed as buttons)
   - Use for: Yes/No, gender, mutually exclusive options
   - Options: Multiple options, required field

6. **Date Picker**: Calendar date selection
   - Use for: Deadlines, birthdates, appointment dates
   - Options: Required field

7. **File Upload**: Attach documents/images
   - Use for: Documents, photos, attachments
   - Options: Required field
   - Uploads stored in Google Drive (if configured)

8. **Table/Multiple Items**: Repeating row structure
   - Use for: Line items, multiple entries, inventory
   - Options: Define columns, column types, required
   - Example: Order items with quantity, price, description

#### Creating a Form:

**Step 1: Basic Information**
1. Click "+ New Form Template"
2. Enter unique Form ID (e.g., "customer-intake")
3. Enter form title (displayed to users)
4. Add description (optional)

**Step 2: Add Questions**
1. Click "Add Question"
2. Select question type
3. Enter question label
4. Configure options:
   - For dropdowns/checkboxes/radio: Add all options
   - For tables: Define column structure
   - Set required/optional
   - Add placeholder text
5. Drag questions to reorder
6. Click save on each question

**Step 3: Communication Settings (Optional)**

**WhatsApp Configuration:**
- Enable WhatsApp notifications
- Enter recipient phone number (with country code)
- Create message template using placeholders:
  - `{{fieldId}}`: Inserts form field value
  - Example: "Order {{orderNumber}} received from {{customerName}}"

**Email Configuration:**
- Enable email notifications
- Enter recipient email
- Set email subject
- Create email body template with placeholders
- HTML supported for formatting

**Step 4: Save and Activate**
1. Review all questions
2. Test form preview
3. Save template
4. Form available for workflow assignment

#### Managing Forms:

**Edit Form:**
1. Find form in list
2. Click edit icon
3. Modify questions or settings
4. Save changes
5. Changes apply to new submissions only

**Delete Form:**
1. Click delete icon
2. Confirm deletion
3. Form removed (existing data preserved)

**Test Form:**
1. Click preview icon
2. Fill out form
3. Verify validation
4. Check required fields
5. Test file uploads

#### Form Best Practices:
- Use clear, specific question labels
- Group related questions together
- Mark truly required fields only
- Provide helpful placeholder text
- Test forms before assigning to workflows
- Use appropriate field types for data
- Keep forms concise and focused
- Use tables for repeating data structures

#### Example Form: Customer Order

```
Form ID: customer-order-form
Title: Customer Order Form
Description: Collect customer order details

Questions:
1. Customer Name (Text, Required)
2. Email (Text, Required)
3. Phone Number (Text, Required)
4. Order Date (Date, Required)
5. Product Category (Dropdown, Required)
   Options: Electronics, Clothing, Food, Services
6. Order Items (Table, Required)
   Columns:
   - Item Name (Text)
   - Quantity (Text)
   - Price (Text)
7. Special Instructions (Textarea, Optional)
8. Delivery Required? (Radio, Required)
   Options: Yes, No
9. Attach Purchase Order (File, Optional)

Email Notification:
To: orders@company.com
Subject: New Order - {{customerName}}
Body: Order received from {{customerName}} for {{productCategory}}
```

---

### 6. TAT Configuration

**Path**: `/tat-config` (Admin Only)

**Purpose**: Configure Turn Around Time settings and rules for workflows.

#### Features:

**Working Hours Setup**
- Define business hours
- Set working days (Mon-Fri typical)
- Exclude weekends from TAT calculation
- Configure timezone

**Holiday Management**
- Add company holidays
- Holidays don't count toward TAT
- Import holiday calendar
- Set recurring holidays

**TAT Types Explained**

1. **Day TAT**: 
   - Count in working days
   - Example: 2 days = 2 business days
   - Excludes weekends and holidays

2. **Hour TAT**:
   - Count in hours
   - Can span multiple days
   - Example: 24 hours = next day same time

3. **Before TAT**:
   - Complete before specific time
   - Example: Before 5 PM today
   - Uses 24-hour format (17 = 5 PM)

4. **Specify TAT**:
   - Complete by exact hour today
   - Example: By 3 PM today
   - Value 0-23 (15 = 3 PM)

**Escalation Rules**
- Set up automatic escalations
- Notify managers of overdue tasks
- Configure reminder timings
- Define escalation hierarchy

#### How to Use:
1. Set working hours for organization
2. Add all company holidays
3. Configure default TAT buffers
4. Set up escalation rules
5. Save configuration
6. Rules apply to all new tasks

---

### 7. User Management

**Path**: `/user-management` (Admin Only)

**Purpose**: Manage users, roles, and permissions.

#### Features:

**User List**
- View all organization users
- See roles and status
- Check last login time
- Monitor activity

**Add New User**
1. Click "+ Add User"
2. Enter email address
3. Enter first and last name
4. Select role (Admin or User)
5. Send invitation
6. User receives setup email

**Edit User**
1. Click edit icon
2. Update name or role
3. Change email (triggers verification)
4. Save changes

**Change User Status**
- Active: Can log in and work
- Inactive: Cannot access system
- Suspended: Temporary block
- Toggle status as needed

**User Activity**
- View login history
- See device information
- Check task completion stats
- Monitor performance

**Role Permissions**

**Admin Role:**
- All user permissions plus:
- Create/edit workflows
- Build forms
- Manage users
- View all analytics
- Configure system settings
- API access

**User Role:**
- View assigned tasks
- Complete tasks
- Submit forms
- View personal analytics
- Update profile

#### How to Use:
1. Review user list regularly
2. Add users as team grows
3. Assign appropriate roles
4. Monitor inactive users
5. Update roles as needed
6. Check activity for security

---

### 8. Organization Settings

**Path**: `/organization-settings` (Admin Only)

**Purpose**: Configure organization-wide settings and information.

#### Features:

**Organization Profile**
- Company name
- Address and contact
- Industry type
- Company size
- Tax information
- Logo upload

**Domain Management**
- Add allowed email domains
- Control who can register
- Domain verification
- Email validation rules

**Google Drive Integration**
- Connect Google Drive account
- Configure file storage
- Set folder structure
- Manage permissions
- OAuth setup

**Subscription & Billing**
- View current plan
- Usage statistics
- Upgrade/downgrade
- Billing history
- Payment methods

**Security Settings**
- Password policies
- Session timeout
- Two-factor authentication
- IP whitelist
- Device management

#### How to Use:
1. Complete all organization details
2. Add company email domains
3. Connect Google Drive for file storage
4. Review and adjust security settings
5. Monitor usage and billing
6. Update information as needed

---

### 9. Advanced Simulator

**Path**: `/advanced-simulator` (Admin Only)

**Purpose**: Test workflow logic without creating real tasks.

#### Features:

**Simulation Setup**
1. Select system/workflow
2. Choose starting point
3. Set initial data
4. Configure simulation parameters

**Run Simulation**
- Execute workflow steps
- See task transitions
- Test all paths
- Verify TAT calculations
- Check form validations

**Analysis**
- View execution path
- Identify bottlenecks
- Verify rule logic
- Test error scenarios
- Measure timing

#### How to Use:
1. Select workflow to test
2. Configure test scenario
3. Run simulation
4. Review results
5. Identify issues
6. Fix workflow rules
7. Re-test until correct

---

### 10. Visual Flow Builder

**Path**: `/visual-flow-builder` (Admin Only)

**Purpose**: Create and visualize workflows with a graphical interface.

#### Features:

**Visual Canvas**
- Drag-and-drop interface
- Node-based workflow design
- Visual connections between tasks
- Real-time validation
- Zoom and pan controls

**Node Types**
- Start Node: Workflow beginning
- Task Node: Work step
- Decision Node: Branching logic
- End Node: Workflow completion

**Creating Workflows Visually**
1. Select or create new system
2. Add start node
3. Drag task nodes onto canvas
4. Connect nodes with edges
5. Configure each node:
   - Task name
   - Assignee
   - TAT settings
   - Forms
   - Conditions
6. Add decision points for branching
7. Connect to end node
8. Save workflow

**Benefits Over Text Rules**
- See entire workflow at once
- Understand flow logic visually
- Identify loops and dead ends
- Easier to modify
- Better for complex workflows
- Visual documentation

#### How to Use:
1. Click "+ New Flow" or select existing
2. Add nodes by dragging from palette
3. Click node to edit properties
4. Draw connections between nodes
5. Add conditions on edges
6. Test flow with simulator
7. Save and activate
8. Monitor execution in real-time

---

### 11. Form Responses

**Path**: `/form-responses` (Admin Only)

**Purpose**: View all form submissions across workflows.

#### Features:

**Response List**
- All submitted forms
- Filter by form type
- Search by content
- Date range filtering
- Export to Excel/CSV

**Response Details**
- Complete form data
- Submission timestamp
- Submitter information
- Associated task/workflow
- File attachments

**Bulk Operations**
- Export multiple responses
- Delete old responses
- Archive submissions
- Generate reports

#### How to Use:
1. Select form template to view
2. Apply filters for specific data
3. Click response to see details
4. Download attachments
5. Export data for analysis
6. Archive old responses periodically

---

### 12. Flow Data Viewer

**Path**: `/flow-data` (Admin Only)

**Purpose**: View complete workflow instance history and data.

#### Features:

**Workflow Instance List**
- All active and completed workflows
- Filter by system
- Search by order number
- Status indicators

**Instance Details**
- Complete task history
- All form submissions
- Time spent per task
- Current status
- Assignee history

**Data Export**
- Export single workflow
- Bulk export by system
- Include all attachments
- Generate PDF reports

#### How to Use:
1. Search for specific order number
2. Or filter by system
3. Click workflow to see details
4. Review all steps and data
5. Check for bottlenecks
6. Export for records
7. Share with stakeholders

---

### 13. Data Management

**Path**: `/data-management` (Admin Only)

**Purpose**: Manage system data, backups, and cleanup.

#### Features:

**Backup & Restore**
- Create system backups
- Schedule automatic backups
- Restore from backup point
- Download backup files

**Data Cleanup**
- Archive old workflows
- Delete cancelled tasks
- Clean up old files
- Manage storage space

**Data Export**
- Export all tasks
- Export all forms
- Export user data
- Bulk data download

**Import Tools**
- Import tasks from CSV
- Bulk user import
- Restore from backup
- Migrate from other systems

#### How to Use:
1. Schedule regular backups
2. Monitor storage usage
3. Archive completed workflows quarterly
4. Export data for compliance
5. Clean up old files periodically
6. Test restore procedures

---

### 14. API Documentation

**Path**: `/api-documentation` (Admin Only)

**Purpose**: Access API documentation for integrations.

#### Features:

**API Keys**
- Generate API keys
- Manage existing keys
- Set permissions
- Revoke access
- Monitor API usage

**Endpoints Documentation**
- Start workflow via API
- Create tasks programmatically
- Submit forms through API
- Query task status
- Get workflow data

**Code Examples**
- cURL examples
- JavaScript samples
- Python examples
- Authentication examples

**Webhooks**
- Configure webhook URLs
- Subscribe to events
- Handle callbacks
- Test webhooks

#### How to Use:
1. Generate API key from settings
2. Review endpoint documentation
3. Test with provided examples
4. Implement in your application
5. Monitor API calls
6. Handle errors appropriately

---

### 15. API Start Flow

**Path**: `/api-startflow` (Admin Only)

**Purpose**: Interface to start workflows via API for testing.

#### Features:

**Test API Calls**
- Interactive API tester
- Select endpoint
- Enter parameters
- Send request
- View response

**Generate Code**
- Auto-generate integration code
- Copy-paste ready
- Multiple languages
- Includes authentication

#### How to Use:
1. Select system to start
2. Enter required parameters
3. Click "Test API Call"
4. Review response
5. Copy generated code
6. Implement in your system

---

### 16. Usage & Billing

**Path**: `/usage` (Admin Only)

**Purpose**: Monitor usage statistics and costs.

#### Features:

**Usage Metrics**
- Active workflows count
- Form submissions this month
- Storage used
- User count
- API calls made

**Cost Breakdown**
- Flow costs
- User costs
- Storage costs
- API costs
- Total monthly cost

**Trends & Projections**
- Usage trends over time
- Projected costs
- Comparison with previous months
- Cost optimization suggestions

**Quota Management**
- Maximum users allowed
- Maximum flows per month
- Storage limit
- API call limits
- Upgrade options

#### How to Use:
1. Review usage dashboard monthly
2. Check cost trends
3. Identify optimization opportunities
4. Monitor quota limits
5. Plan for growth
6. Upgrade plan if needed

---

### 17. Payments

**Path**: `/payments` (Admin Only)

**Purpose**: Manage subscription payments and billing.

#### Features:

**Payment Methods**
- Add credit card
- Add bank account
- Set default payment method
- Remove old methods

**Invoices**
- View all invoices
- Download PDF
- Email invoice
- Payment history

**Subscription Management**
- Current plan details
- Upgrade/downgrade
- Cancel subscription
- Renewal date
- Auto-renewal settings

#### How to Use:
1. Add payment method
2. Review invoices monthly
3. Download for accounting
4. Update payment info as needed
5. Manage subscription tier

---

### 18. NDA & Security

**Path**: `/nda-security` (Admin Only)

**Purpose**: Manage security settings and compliance.

#### Features:

**NDA Management**
- Upload company NDA
- Require user acceptance
- Track who signed
- Version control

**Security Audit**
- Login attempts log
- Data access log
- Changes history
- Export audit log

**Compliance**
- GDPR settings
- Data retention policies
- Privacy settings
- Export user data requests

**Security Settings**
- Password requirements
- Session timeout
- IP restrictions
- Two-factor authentication

#### How to Use:
1. Upload NDA for new users
2. Review audit logs regularly
3. Configure security policies
4. Monitor suspicious activity
5. Export logs for compliance
6. Update policies as needed

---

### 19. MongoDB Form Data Viewer

**Path**: `/mongo-form-data-viewer` (Admin Only)

**Purpose**: View form data stored in MongoDB (alternative storage).

#### Features:
- Query MongoDB collections
- View raw form data
- Export collections
- Advanced search
- JSON viewer

#### How to Use:
1. Connect to MongoDB instance
2. Select collection
3. Run queries
4. View results
5. Export data as needed

---

### 20. Organization Control

**Path**: `/organization-control` (Super Admin)

**Purpose**: Super admin panel for managing multiple organizations.

#### Features:
- View all organizations
- Create new organizations
- Disable/enable organizations
- Global settings
- System-wide reports
- License management

#### How to Use:
1. View organization list
2. Click to manage specific org
3. Apply global policies
4. Monitor system health
5. Generate cross-org reports

---

## Common Tasks

### Task 1: Creating Your First Workflow

1. **Design the Workflow** (on paper first):
   ```
   Example: Simple Approval Process
   Start → Submit Request → Manager Review → Complete
   ```

2. **Create Forms** (Form Builder):
   - Request form
   - Review form

3. **Create Flow Rules** (Flows page):
   - Rule 1: Start → Submit Request
   - Rule 2: Submit Request → Manager Review
   - Rule 3: Manager Review → Complete

4. **Test** (Advanced Simulator):
   - Run test scenarios
   - Verify transitions
   - Check TAT calculations

5. **Launch** (Flows page):
   - Start first real instance
   - Monitor progress
   - Adjust as needed

### Task 2: Completing a Task

1. Navigate to Tasks page
2. Find your pending task (use filters)
3. Click task to open details
4. Click "Complete" or form icon
5. Fill all required fields
6. Upload files if needed
7. Select completion status
8. Click Submit
9. Task automatically routes to next person

### Task 3: Tracking Workflow Progress

1. Go to Flow Data Viewer
2. Search by order number
3. View all completed steps
4. See current status
5. Review submitted forms
6. Check time spent per task
7. Identify bottlenecks
8. Export report if needed

### Task 4: Adding a New User

1. Go to User Management
2. Click "+ Add User"
3. Enter email, first name, last name
4. Select role (User or Admin)
5. Click Add
6. User receives invitation email
7. They set password and log in
8. Assign tasks to new user

### Task 5: Generating Analytics Report

1. Go to Analytics page
2. Select Reporting tab
3. Choose system/workflow
4. Set date range
5. Select specific task (optional)
6. Click Generate Report
7. Review metrics and charts
8. Click Download to export
9. Share with stakeholders

### Task 6: Modifying a Workflow

1. Go to Flows page
2. Find rules to modify
3. Click edit icon
4. Make changes to:
   - TAT times
   - Assignees
   - Forms
   - Conditions
5. Save changes
6. New tasks use updated rules
7. Monitor impact of changes

### Task 7: Setting Up File Uploads

1. Go to Organization Settings
2. Navigate to Google Drive section
3. Click "Connect Google Drive"
4. Authorize access
5. Select destination folder
6. Save settings
7. Test file upload in form
8. Verify files appear in Drive

### Task 8: Creating Conditional Workflow

1. Design branching logic
2. Create workflow rules with different statuses:
   ```
   Review → Approved → Next Step
   Review → Rejected → Revise
   Review → Needs Info → Clarify
   ```
3. Test all paths
4. Document conditions for users
5. Monitor which paths are used

### Task 9: Bulk Starting Workflows

1. Prepare CSV file with:
   - Order numbers
   - Descriptions
   - Initial data
2. Use API endpoint or import tool
3. Validate data
4. Start bulk import
5. Monitor progress
6. Verify all created successfully

### Task 10: Monthly Maintenance

1. Review Analytics for trends
2. Check Usage & Billing
3. Archive completed workflows
4. Clean up old files
5. Review user access
6. Update forms as needed
7. Backup system data
8. Generate compliance reports

---

## Tips & Best Practices

### Workflow Design

✅ **Do:**
- Start simple, add complexity gradually
- Use clear, descriptive task names
- Set realistic TAT times
- Test thoroughly before production
- Document workflow logic
- Plan for exception cases
- Use merge conditions for parallel tasks

❌ **Don't:**
- Create circular dependencies
- Use vague task names
- Set unrealistic deadlines
- Skip testing
- Create overly complex workflows
- Forget about error paths

### Form Design

✅ **Do:**
- Keep forms focused and concise
- Use appropriate field types
- Mark only truly required fields
- Provide helpful placeholders
- Test on mobile devices
- Use tables for repeating data
- Enable notifications where useful

❌ **Don't:**
- Make everything required
- Use too many fields
- Forget to validate inputs
- Use confusing labels
- Create overly complex tables

### User Management

✅ **Do:**
- Use clear naming conventions
- Assign roles appropriately
- Review permissions regularly
- Monitor user activity
- Provide training materials
- Set up user groups
- Document procedures

❌ **Don't:**
- Give everyone admin access
- Leave inactive users active
- Share login credentials
- Ignore security best practices
- Skip user training

### Performance Optimization

✅ **Do:**
- Archive old workflows regularly
- Clean up old files
- Monitor system usage
- Use filters effectively
- Export and backup regularly
- Optimize complex forms
- Index frequently searched fields

❌ **Don't:**
- Keep all data forever
- Store massive files
- Create overly complex queries
- Ignore performance warnings
- Skip regular maintenance

### Data Management

✅ **Do:**
- Back up regularly
- Test restore procedures
- Export critical data
- Set retention policies
- Monitor storage usage
- Document data schema
- Maintain audit trails

❌ **Don't:**
- Rely on single backup
- Delete without archiving
- Store sensitive data unencrypted
- Skip compliance requirements
- Ignore data cleanup

### Communication

✅ **Do:**
- Set up email notifications
- Use WhatsApp for urgent tasks
- Customize notification messages
- Test notification delivery
- Include relevant data
- Respect notification preferences
- Monitor notification logs

❌ **Don't:**
- Spam users with notifications
- Use unclear messages
- Forget to test notifications
- Hard-code recipient addresses
- Ignore bounce-backs

### Security

✅ **Do:**
- Use strong passwords
- Enable two-factor authentication
- Review audit logs regularly
- Limit admin access
- Rotate API keys
- Monitor login attempts
- Keep software updated

❌ **Don't:**
- Share credentials
- Ignore security warnings
- Skip security updates
- Give unnecessary permissions
- Forget to revoke old access

### Troubleshooting

**Task Not Moving Forward?**
1. Check if form is filled completely
2. Verify next task has valid assignee
3. Check flow rules configuration
4. Look for error messages
5. Review audit logs

**Can't See Tasks?**
1. Check filters - they may be too restrictive
2. Verify you're assigned to tasks
3. Refresh the page
4. Check user permissions
5. Contact admin if needed

**Form Won't Submit?**
1. Check all required fields
2. Verify file upload sizes
3. Check network connection
4. Clear browser cache
5. Try different browser

**Workflow Stuck?**
1. Find order number in Flow Data
2. Check current task status
3. Verify assignee is active
4. Check if task is overdue
5. Manually intervene if needed
6. Contact affected user

**Reports Not Loading?**
1. Check date range - may be too large
2. Verify filters are correct
3. Wait for query to complete
4. Try more specific filters
5. Export smaller datasets

---

## Getting Help

### Resources
- **In-App Help**: Click ? icon for contextual help
- **Video Tutorials**: Available in help center
- **Documentation**: This guide and API docs
- **Support Email**: support@processsutra.com
- **Community Forum**: forum.processsutra.com

### Support Channels
- **Email Support**: 24-hour response time
- **Live Chat**: Available during business hours
- **Phone Support**: For critical issues
- **Screen Sharing**: For complex problems

### Training
- **Admin Training**: 2-hour onboarding
- **User Training**: 30-minute orientation
- **Advanced Features**: Monthly webinars
- **Custom Training**: Available for enterprises

---

## Appendix

### Glossary

- **Flow**: Complete workflow definition with all rules
- **Task**: Single step in a workflow
- **TAT**: Turn Around Time - deadline for task completion
- **Doer**: Person assigned to complete a task
- **Form Template**: Reusable form definition
- **Form Response**: Completed form submission
- **Order Number**: Unique identifier for workflow instance
- **System**: Workflow type or category
- **Rule**: Definition of task transition
- **Node**: Visual representation of task in flow builder
- **Merge Condition**: How parallel tasks are handled
- **Transfer**: Reassigning task to different user

### Keyboard Shortcuts

- `Ctrl + S`: Save (in editors)
- `Ctrl + F`: Search/Filter
- `Esc`: Close dialog
- `Enter`: Submit form (when focused)
- `Tab`: Next field
- `Shift + Tab`: Previous field

### Best Practices Checklist

**Initial Setup**
- [ ] Complete organization profile
- [ ] Add all users
- [ ] Configure Google Drive
- [ ] Set up working hours
- [ ] Add holidays
- [ ] Create first workflow
- [ ] Design initial forms
- [ ] Test end-to-end

**Regular Maintenance**
- [ ] Review analytics monthly
- [ ] Archive old workflows quarterly
- [ ] Update user list as needed
- [ ] Check storage usage monthly
- [ ] Review and optimize workflows
- [ ] Update forms based on feedback
- [ ] Train new users
- [ ] Backup data weekly

**Security**
- [ ] Review user permissions quarterly
- [ ] Check audit logs weekly
- [ ] Rotate API keys annually
- [ ] Update passwords regularly
- [ ] Review security settings monthly
- [ ] Monitor login activity
- [ ] Update NDA as needed

---

## Version History

**Version 1.0** - December 2025
- Initial comprehensive user guide
- Coverage of all 20+ pages
- Common task documentation
- Best practices and tips
- Troubleshooting guide

---

**Document End**

For the latest updates and additional resources, visit your organization's Process Sutra portal.

© 2025 Process Sutra. All rights reserved.
