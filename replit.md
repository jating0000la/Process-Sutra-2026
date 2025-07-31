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

## Recent Changes (July 31, 2025)
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