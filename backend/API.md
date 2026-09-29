# MRX HealthTECH API

Base URL: `http://localhost:3001/api`  
Interactive OpenAPI UI: `http://localhost:3001/api-docs`

Protected requests require `Authorization: Bearer <JWT>`. JSON responses use `{ "success": true, "data": ... }`; errors contain a readable message and validation details. Roles are `ADMIN`, `DOCTOR`, and `PATIENT`.

## Authentication

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a patient account or pending doctor profile |
| POST | `/auth/login` | Public | Sign in; optional role verifies selected workspace |
| GET | `/auth/me` | Signed in | Return current safe profile |
| POST | `/auth/logout` | Signed in | Record logout audit event; client clears its bearer token |
| PATCH | `/profile` | Patient | Update patient name, email, age, gender, or medical history |
| PATCH | `/doctor/profile` | Doctor | Update doctor profile |

## Shared and clinical APIs

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Service health |
| GET | `/dashboard` | Signed in | Role-specific database-backed dashboard metrics |
| GET | `/doctors` | Signed in | Filter and sort approved doctors |
| GET | `/doctors/:id` | Signed in | View approved profile, availability, and reviews |
| GET | `/doctors/:id/slots?date=YYYY-MM-DD` | Signed in | Get available clinic-local booking slots |
| POST | `/doctors/:id/reviews` | Patient | Review a completed visit |
| GET/POST/DELETE | `/favorites` and `/favorites/:doctorId` | Patient | Manage saved doctors |
| GET | `/appointments` | Signed in | List appointments visible to the current role |
| POST | `/appointments` | Patient/Admin | Request an available slot |
| PATCH | `/appointments/:id/status` | Doctor/Admin | Confirm, reject, complete, or cancel an appointment |
| PATCH | `/appointments/:id/cancel` | Associated patient/doctor/Admin | Cancel an active appointment |
| PATCH | `/appointments/:id/reschedule` | Associated patient/doctor/Admin | Move a visit to a published available slot |
| GET | `/records` | Signed in | List visible test results, prescriptions, reports, and history |
| GET | `/patients/:id/results` | Patient owner/assigned doctor/Admin | View biomarker history |
| POST | `/patients/:id/results` | Assigned doctor/Admin | Add a biomarker result |
| DELETE | `/tests/:id` | Author doctor/Admin | Delete a test result |
| POST | `/prescriptions` | Doctor | Add prescription for an assigned patient |
| POST | `/reports` | Doctor | Create a draft report for an assigned patient |
| PUT | `/reports/:id` | Report author | Edit a draft |
| PATCH | `/reports/:id/publish` | Author doctor/Admin | Publish report and notify patient |
| GET | `/reports/:id/pdf` | Patient owner/author doctor/Admin | Download authorized report PDF |
| POST | `/medical-history` | Doctor | Add history entry for an assigned patient |
| PUT | `/availability` | Doctor | Replace weekly availability |
| GET | `/notifications` | Signed in | List personal notifications |
| PATCH | `/notifications/:id/read` | Notification owner | Mark one notification as read |
| PATCH | `/notifications/read-all` | Signed in | Mark all personal notifications read |

## Administrator APIs

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/admin/users` | List account metadata without password hashes |
| PATCH | `/admin/users/:id/status` | Block or unblock an account |
| GET/POST | `/admin/doctors` | List or create a pending doctor account |
| PUT | `/admin/doctors/:id` | Edit doctor profile |
| PATCH | `/admin/doctors/:id/approval` | Approve or reject doctor account |
| GET | `/admin/audit-logs` | Review recent audit events |
| GET/POST | `/admin/departments` | List or add departments |

## Legacy patient monitoring APIs

Patient CRUD and the original nested test-result endpoints remain available to administrators under `/patients` and `/patients/:id/tests`. The role-aware doctor and patient screens use the scoped platform routes above.
