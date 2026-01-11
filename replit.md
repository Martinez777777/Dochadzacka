# Bakery & Bistro Attendance System (Docházka V1.0)

## Overview

A staff attendance tracking system designed for bakery and bistro operations. Employees use a 4-digit PIN code to log arrivals, departures, lunch breaks, and vacation time. The application features a clean, minimal interface optimized for daily use with fast data entry and clear information hierarchy.

The system includes three main views: a PIN entry home screen for logging attendance, a lunch tracking page, and an admin dashboard for viewing all attendance records.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth UI transitions
- **Build Tool**: Vite with React plugin

**Design Pattern**: Component-based architecture with custom hooks for data fetching. UI components are organized in `client/src/components/ui/` following shadcn/ui conventions.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Storage**: Abstract storage interface (`IStorage`) with in-memory implementation (`MemStorage`)

**Key Design Decision**: The storage layer uses an interface pattern allowing easy swap between in-memory storage and database implementations without changing API code.

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Single `attendance_logs` table tracking code, type, and timestamp
- **Validation**: Zod schemas generated from Drizzle schema using `drizzle-zod`

### Type Safety
- Shared types between frontend and backend via `@shared/*` path alias
- API contracts defined with Zod for runtime validation
- TypeScript strict mode enabled

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **Drizzle Kit**: Database migrations stored in `./migrations`

### Third-Party Libraries
- **Radix UI**: Headless UI primitives for accessible components
- **date-fns**: Date formatting with Slovak locale support
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

### Fonts (CDN)
- Outfit (body text)
- Playfair Display (display/headers)
- JetBrains Mono (monospace/code input)

### Development Tools
- Replit-specific plugins for development (cartographer, dev-banner, runtime-error-modal)