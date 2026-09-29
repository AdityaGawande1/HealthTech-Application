# MRX HealthTECH

**MRX HealthTECH** is a full-stack healthcare management platform designed to connect **patients, doctors, and administrators** through dedicated role-based workspaces.

The platform combines **doctor discovery, appointment management, patient monitoring, biomarker trends, prescriptions, medical reports, notifications, reviews, favorites, and administrative controls** into a single web application.


---

## Features

### Patient Portal

* Secure patient registration and login
* Doctor discovery and search
* Doctor profiles with:

  * Specialization
  * Qualifications
  * Experience
  * Consultation fee
  * Location
  * Availability
  * Ratings and reviews
* Appointment booking
* Appointment cancellation and rescheduling
* Doctor favorites
* Patient profile management
* Medical history
* Test and biomarker history
* Biomarker trend visualization
* Prescription viewing
* Published medical reports
* PDF report download
* Notifications
* Doctor reviews and ratings

### Doctor Workspace

* Secure doctor authentication
* Admin approval before account access
* Doctor profile management
* Specialization and qualification information
* Consultation fee and location
* Weekly availability management
* Appointment management
* Assigned patient management
* Patient medical history
* Biomarker/test result entry
* Test history and trends
* Prescription creation
* Medical report creation
* Report draft and publication workflow
* Patient-specific clinical records

### Admin Workspace

* System dashboard
* User management
* Patient management
* Doctor management
* Doctor account creation
* Doctor approval/rejection
* User activation/deactivation
* Appointment management
* Department management
* Audit log
* Platform-level administration

---

## Healthcare Monitoring

The platform supports longitudinal monitoring of patient biomarkers such as:

* HbA1c
* Fasting Glucose
* Systolic Blood Pressure
* Diastolic Blood Pressure
* Total Cholesterol
* LDL
* HDL
* Hemoglobin
* Creatinine
* TSH
* Vitamin D
* Other custom biomarkers

Patients and authorized doctors can view historical results and visualize changes through interactive charts.

---

## Appointment System

The appointment system includes:

* Doctor availability
* 30-minute appointment slots
* Slot generation based on doctor schedules
* Appointment booking
* Appointment confirmation
* Cancellation
* Rescheduling
* Completed appointments
* Appointment status tracking
* Conflict prevention
* Reusable cancelled slots
* Doctor/patient notifications

Appointment access and modification are controlled by the user's role and relationship to the appointment.

---

## Reports & Prescriptions

Doctors can create clinical records for their assigned patients.

### Prescriptions

* Medicine details
* Dosage
* Frequency
* Duration
* Instructions
* Doctor and patient association

### Medical Reports

* Report title
* Summary
* Clinical content
* Doctor notes
* Draft status
* Publication workflow
* Publication timestamp
* PDF generation

Patients can access reports that have been published for them.

---

## Authentication & Security

The backend implements multiple security layers:

* JWT authentication
* Role-based authorization
* bcrypt password hashing
* Server-side permission checks
* Zod request validation
* Authentication rate limiting
* Helmet security headers
* CORS configuration
* Audit logging
* Protected API routes
* Patient/doctor relationship checks
* Appointment ownership checks

Medical data access is enforced by the backend rather than relying only on frontend navigation.

---

## Technology Stack

### Frontend

* React 18
* Vite
* React Router
* Tailwind CSS
* Axios
* Recharts
* Framer Motion
* React Hook Form
* Zod
* React Hot Toast
* Lucide React
* Socket.IO Client

### Backend

* Node.js
* Express.js
* Prisma ORM
* SQLite
* JWT
* bcrypt
* Zod
* Socket.IO
* PDFKit
* Swagger / OpenAPI
* Helmet
* Express Rate Limit
* Node Cron

---

## Architecture

```text
                   MRX HealthTECH
                         │
              ┌──────────┴──────────┐
              │                     │
         React Frontend        REST API
              │                     │
       React Router          Express.js Backend
              │                     │
       Axios / Socket.IO       Middleware
                                    │
                     ┌──────────────┼──────────────┐
                     │              │              │
                 JWT Auth       Validation      RBAC
                     │              │              │
                     └──────────────┼──────────────┘
                                    │
                               Prisma ORM
                                    │
                               SQLite DB
                                    │
              ┌─────────────────────┼──────────────────┐
              │                     │                  │
          Patients               Doctors            Admin
              │                     │                  │
        Tests / Reports       Appointments       Users / Audit
        Prescriptions         Availability       Departments
```

---

## Project Structure

```text
MRX-HealthTECH/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── portal/
│   │   ├── context/
│   │   ├── api/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── patients/
│   │   │   ├── tests/
│   │   │   └── platform.js
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── dev.db
│   │
│   ├── API.md
│   └── package.json
│
├── start-backend.cmd
├── start-frontend.cmd
└── README.md
```

---

## Database Design

The application uses **Prisma ORM with SQLite** and a relational schema containing:

```text
User
Patient
Doctor
Department
DoctorAvailability
Appointment
Biomarker
TestResult
MedicalHistory
Prescription
Report
Review
FavoriteDoctor
Notification
AuditLog
```

The database includes:

* Foreign-key relationships
* Cascading relations
* Unique constraints
* Indexed queries
* Doctor license uniqueness
* Appointment relationships
* Patient-doctor relationships
* Notification tracking
* Audit history

The schema is managed through versioned Prisma migrations.

---

## API

The frontend communicates with the backend through REST APIs under:

```text
/api
```

Major API modules include:

```text
Authentication
Profiles
Dashboards
Doctors
Doctor Availability
Appointments
Patient Records
Biomarker Results
Prescriptions
Medical Reports
PDF Reports
Notifications
Favorites
Reviews
Admin Users
Admin Doctors
Departments
Audit Logs
```

Interactive API documentation is available through Swagger/OpenAPI.

```text
http://localhost:3001/api-docs
```

---

## Demo Data

The project includes a database seed containing fictional demonstration data.

The seed includes:

* 1 administrator
* 8 doctors
* 10 patients
* Multiple departments
* Doctor availability
* Appointments
* Biomarker definitions
* Historical test results
* Prescriptions
* Medical reports
* Reviews
* Favorite doctors
* Notifications
* Audit events

### Demo Login

| Role    | Email                | Password      |
| ------- | -------------------- | ------------- |
| Admin   | `admin@mrx.local`    | `MrxDemo123!` |
| Doctor  | `doctor1@mrx.local`  | `MrxDemo123!` |
| Patient | `patient1@mrx.local` | `MrxDemo123!` |

Additional seeded doctor and patient accounts are available using the same demo password.

> The seed database contains fictional data only.

---

## Installation

### Requirements

* Node.js 20.19+ or 22.12+
* npm

### Backend

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
```

Configure a secure JWT secret inside:

```text
backend/.env
```

Then run:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npm.cmd run db:seed
```

### Frontend

Open another terminal:

```powershell
cd frontend
npm.cmd install
```

---

## Run the Application

From the project root, start the backend:

```powershell
.\start-backend.cmd
```

Start the frontend in another terminal:

```powershell
.\start-frontend.cmd
```

Then open:

```text
http://localhost:5173
```

### Backend

```text
http://localhost:3001
```

### API Health

```text
http://localhost:3001/api/health
```

### API Documentation

```text
http://localhost:3001/api-docs
```

---

## Database Commands

```powershell
cd backend

npx.cmd prisma migrate status
npx.cmd prisma studio
```

To recreate the demo database:

```powershell
npm.cmd run db:seed
```

> **Warning:** The seed script clears existing development data before recreating the demo dataset. Do not use it against a database containing information you need to keep.

---

## Build & Verification

### Frontend Build

```powershell
cd frontend
npm.cmd run build
```

### Backend Validation

```powershell
cd backend
npx.cmd prisma validate
npx.cmd prisma migrate status
```

---

## Key Engineering Highlights

* Multi-role healthcare architecture
* RESTful API design
* Relational database modeling
* JWT authentication
* Role-based access control
* Server-side authorization
* Doctor approval workflow
* Appointment scheduling engine
* Availability and slot conflict handling
* Biomarker time-series visualization
* Prescription management
* Medical report generation
* PDF generation
* Real-time communication infrastructure
* Input validation
* Rate limiting
* Security middleware
* Audit logging
* Prisma migrations
* Seeded demo environment
* Swagger/OpenAPI documentation
* Modular backend architecture

---

## Future Improvements

* Secure email-based password recovery
* Email/SMS appointment reminders
* HTTP-only cookie authentication
* Refresh-token management
* Advanced pagination and filtering
* External calendar integration
* Cloud deployment
* Secure medical document storage
* Automated testing
* Production monitoring
* Comprehensive security and privacy review

---

## Disclaimer

MRX HealthTECH is a **demonstration healthcare platform** developed for educational and software-development purposes.

It uses fictional/demo data and does not provide medical diagnosis or emergency medical services.

**Do not enter real patient information into this application.**

---

## Built With

**React • Node.js • Express.js • Prisma • SQLite • Tailwind CSS • JWT • Recharts • Socket.IO • Zod • Swagger**
