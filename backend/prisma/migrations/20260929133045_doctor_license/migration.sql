-- Clinician registration numbers are fictional demo identifiers.
ALTER TABLE "doctors" ADD COLUMN "license_number" TEXT;
CREATE UNIQUE INDEX "doctors_license_number_key" ON "doctors"("license_number");
