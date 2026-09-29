# MRX HealthTECH

MRX HealthTECH is a local healthcare management prototype built with React, Vite, Express, Prisma, and SQLite. It extends the original patient monitoring flow with patient, doctor, and administrator workspaces. The portal reads and writes the local database through authenticated APIs.

All demo people and clinical records are fictional. This prototype is for demonstration and development; it is not for emergency care and does not make diagnoses.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## First-time setup

In PowerShell, install the dependencies and prepare the database once:

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
```

Set `JWT_SECRET` in `backend/.env` to a long random value, then run:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npm.cmd run db:seed
```

In a second terminal:

```powershell
cd frontend
npm.cmd install
```

PowerShell may resolve `npm` to a blocked `npm.ps1`; use `npm.cmd` for commands. The Windows launchers below also set the Node.js path for you.

## Run the application

From the project root, open two terminals and run one command in each:

```powershell
.\start-backend.cmd
```

```powershell
.\start-frontend.cmd
```

Open [http://localhost:5173](http://localhost:5173). The API listens on [http://localhost:3001](http://localhost:3001); check `GET /api/health` to confirm it is up. Start only one backend process at a time because port 3001 can only be used by one process.

The launchers can also be run from their respective app folders: `backend/.\start-backend.cmd` or `frontend/.\start-frontend.cmd`.

## Demo accounts

Run `npm.cmd run db:seed` in `backend` to create or refresh these demo profiles. All use the password shown below.

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@mrx.local` | `MrxDemo123!` |
| Doctor | `doctor@mrx.local` | `MrxDemo123!` |
| Patient | `patient@mrx.local` | `MrxDemo123!` |

The sign-in screen has demo access buttons. Patient self-registration is also available. Public registration always creates a patient account; doctor accounts are created by an administrator and require approval before sign-in.

## Implemented workflows

- **Patient:** register and sign in, search approved clinicians, request or cancel an appointment, view appointment updates, test results and trend charts, prescriptions, medical history, published reports, download a report as PDF, and manage notifications.
- **Doctor:** sign in after approval, view assigned patients, review appointments, confirm or decline requests, mark visits complete, record biomarker results, create prescriptions and reports, publish reports, and manage weekly availability.
- **Administrator:** view database-backed platform counts, manage patient records and test results, add clinician accounts, approve clinicians, block/unblock users, manage departments and appointments, and review audit events.
- **Security:** passwords are hashed with bcrypt; APIs use signed JWT sessions and role checks; patient/doctor record access is scoped on the server; appointment requests check for conflicting slots and a database index protects active time slots.
- **Clinical safety:** biomarker charts show recorded measurements without automated diagnoses. Reports are clinician-entered.

## Database and seed data

The SQLite database is `backend/prisma/dev.db`. Prisma migrations extend the existing `Patient` and `TestResult` models without dropping existing records, and add users, doctor profiles, departments, appointments, medical history, prescriptions, reports, notifications, availability, and audit logs. Foreign keys, indexes, and unique constraints enforce the main relationships. The appointment slot index prevents two active appointments for the same doctor and start time.

The seed is safe to run repeatedly. It preserves existing patient records, then ensures the fictional demo accounts and linked sample data exist. To apply new migrations after updating the project:

```powershell
cd backend
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npm.cmd run db:seed
```

## API notes

Protected requests use `Authorization: Bearer <token>`. The API returns JSON envelopes with `success` and `data` fields. See [backend/API.md](backend/API.md) for endpoint and role details.

## Build

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd backend
npx.cmd prisma validate
npx.cmd prisma migrate status
```

## Prototype limitations

- Password recovery and outbound email/SMS delivery are not configured.
- This local prototype does not claim regulatory certification or compliance.
- Appointment availability is editable; booking and rescheduling enforce future half-hour slots within the doctor's published hours and prevent conflicting active bookings. The prototype does not integrate with an external calendar.
- Authentication uses an eight-hour bearer token stored in browser local storage. For a production deployment, use secure same-site cookies, a managed secret, HTTPS, rate limiting, operational monitoring, and a reviewed privacy/security program.
- Historical patient records created before account linking remain administrator-managed until associated with an account.
