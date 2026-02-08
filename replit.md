# Bakery & Bistro Attendance System (Docházka V1.0)

## Overview

A staff attendance tracking system designed for bakery and bistro operations. Employees use a 4-digit PIN code to log arrivals, departures, lunch breaks, and vacation time. The application features a clean, minimal interface optimized for daily use with fast data entry and clear information hierarchy.

The system includes three main views: a PIN entry home screen for logging attendance, a lunch tracking page, and an admin dashboard for viewing all attendance records.

## User Preferences

Preferred communication style: Simple, everyday language.

## Project Architecture

### Logic: Attendance Rules & Capacity
The system enforces specific logic during the check-in (arrival) process:

1. **PIN Validation**: Verifies the 4-digit code against the employee database.
2. **Location Capacity (Limit)**: 
   - Each location has a configurable employee limit (stored in Firestore).
   - If the limit is reached, the system prevents further check-ins.
   - A non-dismissible red popup appears with the message: "Je Vás veľa prihlasených kto tu nemá byť? Napíš manažérovi".
   - The popup lists all currently active employees at that location (Name, Date, Time).
3. **Double Check-in Prevention**: 
   - An employee cannot check in if they haven't checked out from their previous shift.
   - If a previous "Príchod" exists without a corresponding "Odchod", the system displays the time and location of the open shift.
4. **Photo Capture**: 
   - For both arrivals and departures, a photo is captured using the device's camera.
   - Photos are uploaded via FTP to `https://aplikacia.tofako.sk/Fotky/` with standardized naming: `{datum}_{cas}_{akcia}_{meno}_{prevadzka}.jpg`.

### Manager Functions (Manažér Menu)
Access via admin PIN code. Available functions:

1. **Výpis jednotlivo** - Export individual attendance records to Excel (by date range)
2. **Výpis - spolu** - Export summary attendance report to Excel (by date range)
3. **Mazanie dochádzka** - Delete arrivals/departures only (by date range and store)
4. **Mazanie obedy** - Delete lunch records only (by date range and store)
5. **Mazanie dovolenka** - Delete vacation records only (by date range and store)

### API Endpoints

#### Attendance
- `POST /api/attendance` - Log attendance (arrival/departure)
- `GET /api/attendance` - Get all attendance logs
- `POST /api/attendance/delete-range` - Delete arrivals/departures by date range and store

#### Lunch
- `POST /api/lunch` - Log lunch record
- `POST /api/lunch/delete-range` - Delete lunch records by date range and store

#### Vacation
- `POST /api/vacation` - Log vacation record
- `POST /api/vacation/delete-range` - Delete vacation records by date range and store

#### Employees & Stores
- `GET /api/employees` - Get all employees (PIN -> Name mapping)
- `GET /api/stores` - Get all stores
- `GET /api/admin-code` - Get admin PIN code
- `GET /api/store-limit/:store` - Get employee limit for a store
- `GET /api/store-hours/:store` - Get opening/closing hours for a store

#### Export
- `POST /api/export-individual` - Export individual records to Excel via FTP
- `POST /api/export-summary` - Export summary report to Excel via FTP

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
- **API Design**: RESTful endpoints defined in `server/routes.ts`
- **Vercel API**: Identical endpoints in `api/index.ts` for Vercel deployment
- **Storage**: Firebase Firestore for persistent data storage
- **Firebase Config (Hardcoded)**: 
  - Project ID: `dochadzka-web`
  - API Key: `AIzaSyDy_MzgOTL67A6P08UtptHVpcdpYik6Fgc`

### FTP Configuration (Hardcoded)
- Host: `aplikacia.tofako.sk`
- Username: `foto@aplikacia.tofako.sk`
- Password: `Foto2025`
- Folders:
  - Photos: `/Fotky/`
  - Excel exports: `/Exporty/`

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Single `attendance_logs` table tracking code, type, and timestamp
- **Validation**: Zod schemas generated from Drizzle schema using `drizzle-zod`

### Type Safety
- Shared types between frontend and backend via `@shared/*` path alias
- API contracts defined with Zod for runtime validation
- TypeScript strict mode enabled

## File Structure

```
├── api/
│   └── index.ts          # Vercel serverless API (identical to server/routes.ts)
├── client/
│   └── src/
│       ├── components/
│       │   └── ui/       # shadcn/ui components
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # Utility functions
│       └── pages/
│           └── Home.tsx  # Main application page
├── server/
│   ├── index.ts          # Express server entry point
│   └── routes.ts         # All API endpoints
├── shared/
│   └── schema.ts         # Shared types and schemas
├── package.json
├── vercel.json           # Vercel deployment config
├── vite.config.ts        # Vite build configuration
└── replit.md             # This file
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **Drizzle Kit**: Database migrations stored in `./migrations`

### Third-Party Libraries
- **Radix UI**: Headless UI primitives for accessible components
- **date-fns**: Date formatting with Slovak locale support
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management
- **exceljs**: Excel file generation for exports
- **basic-ftp**: FTP uploads for photos and exports

### Fonts (CDN)
- Outfit (body text)
- Playfair Display (display/headers)
- JetBrains Mono (monospace/code input)

### Development Tools
- Replit-specific plugins for development (cartographer, dev-banner, runtime-error-modal)

## Deployment

### Local Development
```bash
npm run dev
```
Server runs on port 5000.

### Vercel Deployment
The `api/index.ts` file contains all the same endpoints as `server/routes.ts` for Vercel serverless deployment. The `vercel.json` configures routing to use the API.

## Timezone
All timestamps use Europe/Bratislava timezone.

## Record Types (Akcia field values)
- `Príchod` / `arrival` - Check-in/arrival
- `Odchod` / `departure` - Check-out/departure  
- `Obed` / `lunch` - Lunch break
- `Dovolenka` / `vacation` - Vacation day
