ALTER TABLE "visit_logs" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "visit_logs" ADD COLUMN "reason_for_action" TEXT NOT NULL DEFAULT '';
CREATE INDEX "visit_logs_status_submitted_at_idx" ON "visit_logs"("status", "submitted_at");
