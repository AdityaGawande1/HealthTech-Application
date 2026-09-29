CREATE UNIQUE INDEX "appointments_active_doctor_slot_key"
ON "appointments"("doctor_id", "start_at")
WHERE "status" IN ('PENDING', 'CONFIRMED', 'RESCHEDULED');
