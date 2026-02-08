# Bakery & Bistro Attendance System (Docházka V1.0)

## Overview

A staff attendance tracking system for bakery and bistro operations. Employees use a PIN code to log arrivals, departures, lunch breaks, and vacation time. The app has a PIN entry home screen, a lunch tracking page, a store selection page, and an admin dashboard for viewing/exporting/deleting attendance records.

The UI is in Slovak language. The system enforces location capacity limits, prevents double check-ins, and captures photos during check-in/check-out via the device camera.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, built with Vite
- **Routing**: Wouter (lightweight React router) with 4 main routes: Home (`/`), Lunches (`/lunches`), Admin (`/admin`), Prevadzka/Store selection (`/prevadzka`)
- **UI Components**: shadcn/ui (new-york style) with Radix UI primitives, Tailwind CSS for styling
- **State Management**: TanStack React Query for server state, local React state for UI
- **Animations**: Framer Motion
- **Fonts**: Outfit (body), Playfair Display (display), JetBrains Mono (monospace)
- **Device Lock**: The app requires a one-time admin PIN entry per device, stored in localStorage under `tofako_device_authorized`
- **Store Selection**: Each device stores its selected store in localStorage under `selectedStore` — this is device-specific, not global

### Backend
- **Development Server**: Express.js running with tsx (TypeScript execution), serves the Vite dev server in development and static files in production
- **Production/Deployment**: Vercel serverless functions. The `api/index.ts` file handles all API requests as a single Vercel serverless function
- **API Pattern**: Both `server/routes.ts` (Express, for local dev) and `api/index.ts` (Vercel serverless) contain duplicated Firestore helper functions and route logic. Changes to API logic need to be made in both files.

### Data Storage
- **Database**: Google Firestore (Firebase) accessed via REST API (not Firebase SDK). The project uses direct HTTP calls to the Firestore REST API with a hardcoded project ID (`dochadzka-web`) and API key.
- **No local database**: There is no Drizzle, PostgreSQL, or any local database. All data lives in Firestore.
- **Key Firestore Collections/Documents**:
  - `Global/Databaza` — Main attendance records stored as a map
  - `Global/Prevadzky` — List of stores/locations
  - `Global/adminCode` — Admin PIN code
  - `Global/Zamestnanci` — Employee data (PIN codes mapped to names)
  - `Global/Limity` — Location capacity limits

### Schema
- Defined in `shared/schema.ts` using Zod for validation (no Drizzle ORM)
- `AttendanceLog`: id, code, type (arrival/departure/lunch/vacation), meno (name), createdAt
- `InsertAttendanceLog`: code, type, optional photoData/photoPath/clientTimestamp/isManual
- Shared route definitions in `shared/routes.ts` with Zod schemas for API contracts

### Key Business Logic
1. **PIN Validation**: 4-digit codes verified against Firestore employee database
2. **Location Capacity**: Each store has a configurable employee limit; exceeding it shows a blocking red popup
3. **Double Check-in Prevention**: Cannot check in without first checking out from previous shift
4. **Photo Capture**: Photos taken on arrival/departure, uploaded via FTP to `https://aplikacia.tofako.sk/Fotky/`
5. **Network Time**: Client fetches time from WorldTimeAPI (Europe/Bratislava timezone) to prevent clock manipulation, with fallback to system time

### Manager Functions (accessed via admin PIN)
- Export individual/summary attendance to Excel (XLSX)
- Delete attendance/lunch/vacation records by date range and store
- Rename employees, manage opening hours

### Path Aliases
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`
- `@assets` → `./attached_assets/`

## External Dependencies

### Services
- **Google Firestore**: Primary database, accessed via REST API (project: `dochadzka-web`)
- **FTP Server**: Photo uploads to `aplikacia.tofako.sk` using `basic-ftp` library
- **WorldTimeAPI**: Network time synchronization (`https://worldtimeapi.org/api/timezone/Europe/Bratislava`)
- **Vercel**: Production deployment platform (configured in `vercel.json`)

### Key Libraries
- **Frontend**: React, Wouter, TanStack React Query, Framer Motion, shadcn/ui, Radix UI, date-fns (with Slovak locale), Lucide icons, Uppy (file uploads)
- **Backend**: Express.js, basic-ftp, xlsx (Excel generation), Zod (validation)
- **Build**: Vite, TypeScript, Tailwind CSS, PostCSS

### Deployment Notes
- Vercel config rewrites `/api/*` to the single serverless function at `/api/index.ts`
- All other routes fall through to `index.html` for client-side routing
- Build output goes to `dist/public`
- Node.js 20.x required