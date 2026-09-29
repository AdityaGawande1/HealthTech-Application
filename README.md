# MRX HealthTECH

MRX HealthTECH is a database-backed healthcare management prototype built on the existing patient monitoring application. It provides role-separated workspaces for patients, doctors, and administrators, with doctor-entered records and sample demo data.

> Demonstration software only. It is not for emergency care, does not make automated diagnoses, and is not certified for regulated healthcare use.

## What is new in this version

- Pages now open correctly the first time. Old page data is never shown on a different page, and a page error can be retried without reloading the browser.
- Creating a new account no longer shows "Validation failed". Blank optional fields are ignored and any problem is explained in plain English.
- All text is in English, and demo names are Indian names.

## Features

- **Patient portal:** account registration, doctor discovery with filters and availability, doctor profiles, appointment booking/cancellation/rescheduling, test history and trends, prescriptions, published reports with PDF download, and notifications.
- **Doctor workspace:** approval-gated sign-in, assigned patient panel, appointment management, biomarker result entry, prescriptions, report drafts/publication, profile and availability management.
- **Admin workspace:** database-backed system dashboard, patient and user management, doctor creation/approval, appointments, departments, and audit log.
- **Shared services:** bcrypt password hashing, signed JWT sessions, server-side role checks, Zod API validation, audit events, notifications, SQLite/Prisma relational storage, and OpenAPI UI.

## Architecture

- `frontend/` - React 18, Vite, React Router, Tailwind CSS, Axios, Recharts.
- `backend/src/app.js` - Express middleware, CORS, security headers, API docs, and routes.
- `backend/src/modules/platform.js` - role-aware platform APIs and business rules.
- `backend/src/modules/patients/` and `backend/src/modules/tests/` - preserved patient-monitoring services and legacy admin routes.
- `backend/src/utils/availability.js` - clinic timezone slot generation and conflict checks.
- `backend/prisma/schema.prisma` and `backend/prisma/migrations/` - relational schema and versioned SQLite migrations.

The browser calls REST APIs under `/api`. Protected calls send `Authorization: Bearer <JWT>`. Medical reads and writes are scoped by the signed-in user's role and care relationship on the server.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Setup

In a PowerShell terminal:

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
```

Set a long random `JWT_SECRET` in `backend/.env`, then prepare the local database:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npm.cmd run db:seed
```

In another terminal:

```powershell
cd frontend
npm.cmd install
```

Use `npm.cmd` in PowerShell if the `npm` PowerShell script is blocked.

## Run locally

From the project root, start the two processes in separate terminals:

```powershell
.\start-backend.cmd
```

```powershell
.\start-frontend.cmd
```

Then open [http://localhost:5173](http://localhost:5173). The API health check is [http://localhost:3001/api/health](http://localhost:3001/api/health), and interactive OpenAPI docs are at [http://localhost:3001/api-docs](http://localhost:3001/api-docs).

## Demo accounts

The seed creates sample accounts with the same local-only password:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@mrx.local` | `MrxDemo123!` |
| Doctor | `doctor1@mrx.local` | `MrxDemo123!` |
| Patient | `patient1@mrx.local` | `MrxDemo123!` |

The login screen offers one-click demo access. Patient accounts can self-register. Doctor self-registration creates a pending profile that an administrator must approve. Password recovery is not connected to outbound email and the recovery page explains the current limitation.

## Database

SQLite development database: `backend/prisma/dev.db`. Schema changes are kept in ordered Prisma migrations. Use:

```powershell
cd backend
npx.cmd prisma migrate deploy
npx.cmd prisma migrate status
npx.cmd prisma studio
```

Seed fictional data with `npm.cmd run db:seed` from `backend/`. **The seed clears and recreates all data in the configured database**, so use it only for disposable local demo data. It contains eight fictional doctors, ten patients, appointment examples, biomarkers, test history, prescriptions, reports, reviews, notifications, and audit events.

The schema uses Prisma relations, foreign keys, indexes, and uniqueness constraints for accounts, identifiers, reviews, favorites, and doctor license numbers. Appointment slot conflicts are checked in a SQLite transaction; cancelled visits release their times for rebooking. The schema keeps status fields as validated strings to make a later PostgreSQL migration straightforward.

## API and permissions

Full route notes are in [backend/API.md](backend/API.md). Interactive docs are served at `/api-docs`. Main API groups include authentication, role-specific dashboard, doctor discovery and availability, appointments, clinical records, test results, prescriptions, reports/PDF, notifications, and admin user/department/audit endpoints.

Admins manage platform accounts and system data. Doctors can access patients assigned to them and manage their related clinical records. Patients can access only their own records and appointments. The backend enforces these rules independently of frontend navigation.

## Build and verification

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd backend
npx.cmd prisma validate
npx.cmd prisma migrate status
```

## Screenshots

Add product screenshots here after capturing the local patient, doctor, and admin workspaces.

## Future improvements

- Configure secure email-based password recovery and delivery of appointment reminders.
- Move browser sessions from local storage to secure, same-site cookies and add refresh/revocation support.
- Add pagination and richer admin editing/report filters.
- Add external calendar integration, attachment storage, deployment monitoring, and a reviewed security/privacy program.

## Security and privacy notes

Passwords are stored as bcrypt hashes. JWT signing keys must be supplied through environment variables for deployment; production startup rejects the development fallback. API endpoints validate input and enforce role/care relationships. This repository is a local prototype, not a HIPAA or other compliance claim; do not enter real patient information. The development seed deletes existing database rows and should never be pointed at a database with records to keep.
