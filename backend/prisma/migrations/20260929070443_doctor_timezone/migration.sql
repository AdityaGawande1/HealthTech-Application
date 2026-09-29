-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_doctors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "department_id" TEXT,
    "specialization" TEXT NOT NULL,
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "bio" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "doctors_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_doctors" ("active", "approved", "bio", "created_at", "department_id", "experience_years", "id", "location", "specialization", "updated_at", "user_id") SELECT "active", "approved", "bio", "created_at", "department_id", "experience_years", "id", "location", "specialization", "updated_at", "user_id" FROM "doctors";
DROP TABLE "doctors";
ALTER TABLE "new_doctors" RENAME TO "doctors";
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("user_id");
CREATE INDEX "doctors_specialization_approved_active_idx" ON "doctors"("specialization", "approved", "active");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
