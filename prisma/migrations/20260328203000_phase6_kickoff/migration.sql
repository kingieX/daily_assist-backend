CREATE TYPE "ReportStatus" AS ENUM ('NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'BILLED');
CREATE TYPE "ReportType" AS ENUM ('INCIDENT', 'VISIT_QUALITY', 'STAFF_PERFORMANCE', 'SYSTEM');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE', 'SETTINGS_UPDATE', 'REPORT_PROCESSING');

CREATE TABLE "reports" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" "ReportType" NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'NEW',
  "billing_processed" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "system_settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value_json" JSONB NOT NULL,
  "updated_by" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "action" "AuditAction" NOT NULL,
  "entity" TEXT NOT NULL,
  "entity_id" TEXT,
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");
CREATE INDEX "reports_type_created_at_idx" ON "reports"("type", "created_at");
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");
CREATE INDEX "audit_logs_entity_created_at_idx" ON "audit_logs"("entity", "created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
