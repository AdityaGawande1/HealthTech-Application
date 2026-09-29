# MRX HealthTECH API

Base URL: `http://localhost:3001/api`

Protected endpoints require `Authorization: Bearer <JWT>`. JSON responses use `{ "success": true, "data": ... }`; errors include `success: false` and a message. User roles are `ADMIN`, `DOCTOR`, and `PATIENT`.

## Authentication

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a patient account and profile |
| POST | `/auth/login` | Public | Sign in; optional `role` field verifies the selected role |
| GET | `/auth/me` | Signed in | Return the current safe user profile |
| PATCH | `/profile` | Patient | Update the signed-in patient's name, email, age, gender, or medical history |

## Shared clinical APIs

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Service health |
| GET | `/dashboard` | Signed in | Role-specific database-backed dashboard data |
| GET | `/doctors?search=` | Signed in | Search approved doctors by name, specialty, department, or location |
| GET | `/doctors/:id` | Signed in | View approved doctor profile and availability |
| GET | `/appointments` | Signed in | List appointments visible to the current role |
| POST | `/appointments` | Patient | Request a 30-minute appointment |
| PATCH | `/appointments/:id/status` | Doctor/Admin | Confirm, reject, complete, or cancel an appointment |
| PATCH | `/appointments/:id/cancel` | Patient/assigned Doctor/Admin | Cancel an appointment the user is associated with |
| PATCH | `/appointments/:id/reschedule` | Doctor/Admin | Move a visit to a future time in the doctor's published availability |
| GET | `/records` | Signed in | List visible results, prescriptions, reports, and medical history |
| GET | `/patients/:id/results` | Owner Patient/Assigned Doctor/Admin | View biomarker results |
| POST | `/patients/:id/results` | Assigned Doctor/Admin | Add a biomarker result |
| DELETE | `/tests/:id` | Doctor/Admin | Delete an authorized test result |
| POST | `/prescriptions` | Doctor | Add a prescription for an assigned patient |
| POST | `/reports` | Doctor | Create a report, optionally publish it to the patient |
| GET | `/reports/:id/pdf` | Report owner/author/Admin | Download a PDF report |
| POST | `/medical-history` | Doctor | Add a medical history entry for an assigned patient |
| GET | `/notifications` | Signed in | List personal notifications |
| PATCH | `/notifications/:id/read` | Notification owner | Mark a notification as read |
| PUT | `/availability` | Doctor | Replace the doctor's weekly availability; the profile endpoint includes current slots |

## Administrator APIs

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/admin/users` | List account metadata without password hashes |
| PATCH | `/admin/users/:id/status` | Block or unblock a user |
| GET/POST | `/admin/doctors` | List clinicians or create an account pending approval |
| PATCH | `/admin/doctors/:id/approval` | Approve or revoke a clinician account |
| GET | `/admin/audit-logs` | Review recent audit events |
| GET/POST | `/admin/departments` | List or add departments |

## Legacy patient monitoring APIs

Patient create, list, update, delete, and original nested test-result endpoints remain available to administrators under `/patients` and `/patients/:id/tests`. The role-aware clinician and patient screens use the scoped routes above for patient data.
