-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "cancelled_by" TEXT;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "after" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "before" TEXT;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN "allergies" TEXT;
ALTER TABLE "patients" ADD COLUMN "blood_group" TEXT;
ALTER TABLE "patients" ADD COLUMN "date_of_birth" DATETIME;
ALTER TABLE "patients" ADD COLUMN "emergency_contact" TEXT;
ALTER TABLE "patients" ADD COLUMN "phone" TEXT;

-- CreateTable
CREATE TABLE "biomarkers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "reference_min" REAL,
    "reference_max" REAL,
    "category" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reviews_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "favorite_doctors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorite_doctors_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "favorite_doctors_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_doctor_availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctor_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_minutes" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "doctor_availability_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_doctor_availability" ("active", "day_of_week", "doctor_id", "end_time", "id", "start_time") SELECT "active", "day_of_week", "doctor_id", "end_time", "id", "start_time" FROM "doctor_availability";
DROP TABLE "doctor_availability";
ALTER TABLE "new_doctor_availability" RENAME TO "doctor_availability";
CREATE UNIQUE INDEX "doctor_availability_doctor_id_day_of_week_start_time_key" ON "doctor_availability"("doctor_id", "day_of_week", "start_time");
CREATE TABLE "new_doctors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "department_id" TEXT,
    "specialization" TEXT NOT NULL,
    "qualifications" TEXT NOT NULL DEFAULT '',
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "languages" TEXT NOT NULL DEFAULT 'English',
    "clinic_name" TEXT,
    "city" TEXT,
    "location" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "consultation_fee" REAL NOT NULL DEFAULT 0,
    "bio" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'Other',
    "rating_avg" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "doctors_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_doctors" ("active", "approved", "bio", "created_at", "department_id", "experience_years", "id", "location", "specialization", "timezone", "updated_at", "user_id") SELECT "active", "approved", "bio", "created_at", "department_id", "experience_years", "id", "location", "specialization", "timezone", "updated_at", "user_id" FROM "doctors";
DROP TABLE "doctors";
ALTER TABLE "new_doctors" RENAME TO "doctors";
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("user_id");
CREATE INDEX "doctors_specialization_approved_active_idx" ON "doctors"("specialization", "approved", "active");
CREATE INDEX "doctors_city_consultation_fee_idx" ON "doctors"("city", "consultation_fee");
CREATE TABLE "new_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_notifications" ("created_at", "id", "message", "read_at", "title", "user_id") SELECT "created_at", "id", "message", "read_at", "title", "user_id" FROM "notifications";
DROP TABLE "notifications";
ALTER TABLE "new_notifications" RENAME TO "notifications";
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");
CREATE TABLE "new_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "doctor_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "published_at" DATETIME,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reports_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_reports" ("content", "created_at", "doctor_id", "id", "patient_id", "published", "summary", "title", "updated_at") SELECT "content", "created_at", "doctor_id", "id", "patient_id", "published", "summary", "title", "updated_at" FROM "reports";
DROP TABLE "reports";
ALTER TABLE "new_reports" RENAME TO "reports";
CREATE INDEX "reports_patient_id_status_created_at_idx" ON "reports"("patient_id", "status", "created_at");
CREATE INDEX "reports_patient_id_published_created_at_idx" ON "reports"("patient_id", "published", "created_at");
CREATE TABLE "new_test_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patient_id" TEXT NOT NULL,
    "biomarker_id" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "test_date" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doctor_id" TEXT,
    "entered_by_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'LAB',
    "remarks" TEXT,
    "notes" TEXT,
    CONSTRAINT "test_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "test_results_biomarker_id_fkey" FOREIGN KEY ("biomarker_id") REFERENCES "biomarkers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "test_results_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "test_results_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- The old prototype stored arbitrary biomarker names. Those demo rows cannot be
-- safely linked to the new biomarker catalog, so discard them during this schema transition.
DROP TABLE "test_results";
ALTER TABLE "new_test_results" RENAME TO "test_results";
CREATE INDEX "test_results_patient_id_test_date_idx" ON "test_results"("patient_id", "test_date");
CREATE INDEX "test_results_biomarker_id_test_date_idx" ON "test_results"("biomarker_id", "test_date");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "avatar_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("created_at", "email", "id", "name", "password_hash", "role", "status", "updated_at") SELECT "created_at", "email", "id", "name", "password_hash", "role", "status", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "biomarkers_name_key" ON "biomarkers"("name");

-- CreateIndex
CREATE INDEX "biomarkers_category_name_idx" ON "biomarkers"("category", "name");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_appointment_id_key" ON "reviews"("appointment_id");

-- CreateIndex
CREATE INDEX "reviews_doctor_id_created_at_idx" ON "reviews"("doctor_id", "created_at");

-- CreateIndex
CREATE INDEX "favorite_doctors_doctor_id_idx" ON "favorite_doctors"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_doctors_patient_id_doctor_id_key" ON "favorite_doctors"("patient_id", "doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_doctor_id_start_at_key" ON "appointments"("doctor_id", "start_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
