# Intelligent Task Flow & Form Management System

## Overview

This is a full-stack TypeScript application built with React/Vite frontend and Express.js backend, designed to automate and manage organizational workflows. The system provides configurable task flows, dynamic form building, role-based task assignments, and comprehensive analytics - replacing static Google-based systems with a scalable, server-hosted solution.

**Current Status**: Fully operational workflow automation system with working authentication, form building, task management, and analytics dashboard. Successfully tested with live data and user interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **API Design**: RESTful endpoints with structured error handling
- **Middleware**: Request logging, JSON parsing, CORS handling

### Database Architecture
- **Primary Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with type-safe queries
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Connection pooling with @neondatabase/serverless

## Key Components

### Authentication System
- Replit Auth integration with OIDC
- Session-based authentication with PostgreSQL storage
- User profile management with role-based access
- Automatic redirects for unauthorized access

### Task Flow Engine
- JSON-defined workflow rules in `flowRules` table
- Automatic task creation and progression
- Role-based task assignment with email notifications
- Turnaround time (TAT) tracking with configurable units

### Form Builder System
- Dynamic form template creation with drag-and-drop interface
- 15+ input types (text, textarea, select, checkbox, radio, date, file upload)
- Form validation with Zod schemas
- Reusable form templates with unique form IDs

### Data Models
- **Users**: Profile information, roles, authentication data
- **FlowRules**: Workflow progression logic and assignment rules
- **Tasks**: Individual work items with status tracking
- **FormTemplates**: Reusable form definitions
- **FormResponses**: Collected form data linked to tasks/flows

### Analytics & Reporting
- Task completion metrics and performance tracking
- Flow bottleneck identification
- Visual dashboards with charts and graphs
- Real-time progress monitoring

## Data Flow

1. **Flow Initiation**: Admin creates flow rules defining task progression
2. **Task Creation**: System automatically generates tasks based on flow rules
3. **Task Assignment**: Tasks assigned to users based on role/email matching
4. **Form Integration**: Tasks can include associated forms for data collection
5. **Progress Tracking**: System monitors task completion and flow progression
6. **Analytics Generation**: Performance data aggregated for reporting

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit Auth service
- **UI Library**: Radix UI primitives for accessible components
- **Validation**: Zod for runtime type checking
- **Charts**: Recharts for data visualization

### Development Tools
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Fast development server with plugin ecosystem
- **Tailwind CSS**: Utility-first CSS framework
- **Drizzle Kit**: Database schema management

## Deployment Strategy

### Development Environment
- Vite dev server with hot module replacement
- Express server with tsx for TypeScript execution
- Shared schema between client and server
- Replit-specific plugins for development experience

### Production Build
- Frontend: Vite build to static assets in `dist/public`
- Backend: esbuild bundling to `dist/index.js`
- Single-server deployment with static file serving
- Environment variable configuration for database and auth

### Database Management
- Schema definitions in `shared/schema.ts`
- Migrations managed through Drizzle Kit
- Push-based schema updates for development
- PostgreSQL connection pooling for production

### Session & Security
- Secure session cookies with httpOnly and secure flags
- CSRF protection through session-based authentication
- Role-based access control for API endpoints
- Environment variable management for secrets

## Recent Changes (August 1, 2025)
- ✓ Fixed form submission validation errors in form response API
- ✓ Implemented complete form dialog functionality with proper data binding
- ✓ Resolved TypeScript errors in form rendering and task management
- ✓ Successfully tested end-to-end workflow: flow creation → task generation → form submission → task completion
- ✓ Verified automatic task progression and workflow automation
- ✓ Added interactive status dropdown for tasks (Pending, In Progress, Completed, Overdue)
- ✓ Enhanced workflow engine to support status-dependent task progression
- ✓ Next tasks now automatically generated based on current task status changes
- ✓ All major system components operational with live user testing
- ✓ Added bulk import functionality for complex workflow rules with "Import Order Tracker" button
- ✓ Enhanced TAT calculation system with sophisticated business logic (office hours, weekend handling)
- ✓ Implemented configurable TAT settings with new TAT Configuration page
- ✓ Added support for multiple TAT calculation methods (hourtat, daytat, beforetat, specifytat)
- ✓ System now handles timezone-aware calculations and office hour constraints
- ✓ Added "View Flow Data" button in task completion popup to display all form data for entire workflow
- ✓ Removed manual status dropdown options from task cards to prevent user errors and simplify interface
- ✓ Tasks now display status as read-only badges instead of editable dropdowns
- ✓ Enhanced flow creation with mandatory order numbers, descriptions, and comprehensive WHO/WHAT/WHEN/HOW context
- ✓ Tasks now display complete flow context including initiator, purpose, timing, and initial form data
- ✓ Implemented comprehensive Flow Simulator with real-time workflow visualization like BP simulator
- ✓ Added lunch break consideration (1-hour break at 12:00-13:00) in all TAT calculations and simulations
- ✓ Created interactive simulation dashboard with throughput analysis, performance metrics, and visual timeline
- ✓ Simulator includes queue time, processing time, lunch breaks, and efficiency calculations
- ✓ Added task transfer functionality to flow rules system allowing tasks to be reassigned between users
- ✓ Enhanced flow rule creation with transfer options including transferable flag and target email lists
- ✓ Implemented task transfer API endpoint with validation and tracking of transfer history
- ✓ Added transfer UI in task management with dialog for selecting target email and reason
- ✓ System now tracks original assignee, transfer timestamp, and transfer reason for audit trail
- ✓ Implemented table/multiple line item support in form builder with configurable columns and data types
- ✓ Enhanced task display to show initial form data from first task across all subsequent tasks in workflow
- ✓ Added prominent initial form data section in flow data dialog for better context visibility
- ✓ Updated backend to automatically fetch and include first form response data in all workflow tasks
- ✓ System now maintains complete workflow context from initiation through completion
- ✓ Complete role-based access control implemented with admin/user permission system
- ✓ Backend routes protected - admins access all features, users limited to tasks/forms/performance
- ✓ User-specific data isolation - users see only their tasks and performance metrics
- ✓ Form management, flow creation, analytics, and configuration restricted to admin role
- ✓ Frontend navigation automatically adapts based to user role with proper route protection
- ✓ Comprehensive user management system with device tracking, login logs, and security monitoring
- ✓ Added automatic device fingerprinting and location tracking for enhanced security
- ✓ Implemented user profile management with status control (active, inactive, suspended)
- ✓ Enhanced database schema with detailed user fields (username, phone, department, employee ID, etc.)
- ✓ On-time scoring calculation confirmed correct: (completed tasks on time / total completed tasks) * 100
- ✓ Fixed table data formatting in initial data section - table responses now display as readable product details
- ✓ Enhanced getReadableFormData function to properly format table columns with item numbers and field labels
- ✓ Improved initial data section styling with better visual hierarchy and always-visible display
- ✓ Resolved [object Object] display issue for table data in task cards with proper column mapping
- ✓ Converted table data to proper HTML table format with headers, borders, and responsive layout
- ✓ Added form name section to initial data with visual separation and green gradient styling
- ✓ Enhanced data organization with clear form identification and structured data presentation
- ✓ Implemented comprehensive flow data viewer showing all previous task form data with their respective form names
- ✓ Added chronological display of all completed tasks in the same flow with proper form identification
- ✓ Enhanced data view button to show complete workflow history instead of just initial data
- ✓ Successfully migrated authentication system from Replit Auth to Google Firebase authentication
- ✓ Implemented Firebase popup-based Google sign-in with proper error handling and fallback mechanisms
- ✓ Fixed database constraint violations during user upsert operations by preventing ID conflicts
- ✓ Established proper session management mapping Firebase users to database user records
- ✓ Authentication flow now fully operational with seamless dashboard access and data loading
- ✓ **COMPLETED: Commercial Multi-Tenant Task Flow Management System**
- ✓ Implemented complete organization-based data isolation with automatic admin assignment
- ✓ Created comprehensive user management where only organization admins can add users
- ✓ Built suspended user blocking at authentication, API, and database levels
- ✓ Added Organization Settings page for admins to create organizations and manage users
- ✓ Established role-based access control with admin/user permission separation
- ✓ Verified multi-tenant authentication: First user per organization becomes admin, subsequent users must be admin-added
- ✓ Confirmed proper organization isolation: Users from different organizations see completely separate data
- ✓ Tested authentication rejection system: Unregistered users properly blocked with error messages
- ✓ **DATABASE ISOLATION COMPLETE**: Added organizationId to ALL database tables for complete data separation
- ✓ Enhanced schema with organizationId fields in userLoginLogs, userDevices, passwordChangeHistory, tatConfig
- ✓ Database constraints updated to enforce organization-level data isolation across all user-related tables
- ✓ Verified organization-specific analytics: Different organizations see completely different metrics (47 vs 0 tasks)
- ✓ Real-time organization filtering confirmed working across tasks, analytics, and user management endpoints
- ✓ **DYNAMIC FORM DATA DISPLAY**: Enhanced form data rendering to support all field types with proper formatting
- ✓ Form field labels now display correctly instead of technical IDs (Customer Name vs q_1753964567191)
- ✓ Table column headers show proper labels (Product Name, Quantity) instead of generated IDs (col_1753969958037)
- ✓ Comprehensive type-based formatting for select/radio options, checkboxes, dates, files, tables, and text fields
- ✓ Backward compatibility maintained for both legacy and new form data formats across all form types
- ✓ Position-based column mapping for table data ensures accurate header-to-data alignment
- ✓ **GMAIL DOMAIN HANDLING**: Modified authentication to treat complete Gmail addresses as unique domains
- ✓ Gmail users now automatically create individual organizations instead of sharing a single gmail.com domain
- ✓ Each Gmail user gets their own isolated workspace with admin privileges for their personal organization
- ✓ Enhanced multi-tenant isolation for personal Gmail accounts while maintaining domain-based organizations for business emails
- ✓ **ADMIN SUSPENSION PROTECTION**: Implemented mandatory admin protection preventing admin account suspension
- ✓ Frontend validation removes "Suspended" option from admin user status dropdowns with clear error messages
- ✓ Backend API validation prevents admin suspension attempts with descriptive error responses
- ✓ Self-protection prevents admins from suspending their own accounts ensuring organizational continuity
- ✓ **ROLE-BASED ROUTE PROTECTION**: Complete user access restriction to Dashboard, Performance, and Tasks only
- ✓ Admin-only routes protected with ProtectedRoute component preventing unauthorized direct URL access
- ✓ Role-based sidebar navigation automatically shows appropriate menu items based on user permissions
- ✓ Enhanced security ensuring regular users cannot access administrative functions or pages