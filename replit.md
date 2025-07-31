# Intelligent Task Flow & Form Management System

## Overview

This is a full-stack TypeScript application built with React/Vite frontend and Express.js backend, designed to automate and manage organizational workflows. The system provides configurable task flows, dynamic form building, role-based task assignments, and comprehensive analytics - replacing static Google-based systems with a scalable, server-hosted solution.

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