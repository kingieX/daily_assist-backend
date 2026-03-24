-- Enforce one active/in-flight worker application per email (case-insensitive).
-- Allows re-application only when prior applications are REJECTED.
CREATE UNIQUE INDEX "worker_applications_active_email_unique_idx"
ON "public"."worker_applications"(LOWER("email"))
WHERE "status" IN ('PENDING', 'SHORTLISTED', 'INTERVIEWED', 'APPROVED', 'CONVERTED_TO_STAFF');
