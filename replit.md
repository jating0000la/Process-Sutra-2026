# Intelligent Task Flow & Form Management System

## Overview
This project is a full-stack TypeScript application designed to automate and manage organizational workflows. It provides configurable task flows, dynamic form building, role-based task assignments, and comprehensive analytics. The system aims to replace static, Google-based solutions with a scalable, server-hosted platform, offering a robust solution for workflow automation. It includes a multi-tenant architecture for organization-based data isolation and advanced features like TAT tracking, a flow simulator, and task transfer capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables
- **Charts**: Recharts

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Google Firebase authentication
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **API Design**: RESTful endpoints
- **Middleware**: Request logging, JSON parsing, CORS handling

### Database Architecture
- **Primary Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Connection pooling with @neondatabase/serverless

### Core Features
- **Authentication System**: Firebase-based authentication with Google sign-in, session management, and role-based access control (Admin/User) including multi-tenant support and organization-specific user management. Admin accounts are protected from suspension.
- **Task Flow Engine**: JSON-defined workflow rules, automatic task creation and progression, role-based assignment, email notifications, and configurable Turnaround Time (TAT) tracking (including office hours and lunch breaks). Supports task transfer and detailed flow context display.
- **Form Builder System**: Dynamic form template creation with drag-and-drop interface, 15+ input types (including tables/multiple line items), Zod validation, and reusable templates. Form data display is dynamic and type-formatted.
- **Data Models**: Users, FlowRules, Tasks, FormTemplates, FormResponses. All data models include `organizationId` for multi-tenancy.
- **Analytics & Reporting**: Task completion metrics, flow bottleneck identification, visual dashboards with charts, real-time progress monitoring, and organization-specific analytics.
- **Multi-Tenancy**: Complete organization-based data isolation enforced by `organizationId` across all database tables. The first user per organization becomes the admin, and subsequent users are added by the admin. Gmail users get individual organizations.
- **Security**: Secure session cookies, CSRF protection, role-based access control for API endpoints and frontend routes, user management with device tracking, login logs, and user profile status control.

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Google Firebase
- **UI Library**: Radix UI primitives
- **Validation**: Zod
- **Charts**: Recharts

### Development Tools
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Fast development server
- **Tailwind CSS**: Utility-first CSS framework
- **Drizzle Kit**: Database schema management