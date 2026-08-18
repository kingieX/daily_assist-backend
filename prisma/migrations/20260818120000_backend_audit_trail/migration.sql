ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FAILED_LOGIN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CONFIRM';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CANCEL';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ASSIGN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACTIVATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DEACTIVATE';

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actor_email" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actor_name" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actor_role" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "module" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "affected_item" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ip_address" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;

UPDATE "audit_logs"
SET
  "module" = COALESCE(("metadata_json"->>'module'), "entity"),
  "affected_item" = COALESCE(("metadata_json"->>'affectedItem'), CASE WHEN "entity_id" IS NULL THEN "entity" ELSE "entity" || ': ' || "entity_id" END),
  "description" = COALESCE(("metadata_json"->>'description'), "action"::text || ' ' || "entity"),
  "status" = COALESCE(("metadata_json"->>'status'), "status", 'SUCCESS'),
  "ip_address" = COALESCE(("metadata_json"->>'ipAddress'), "ip_address")
WHERE "module" IS NULL OR "description" IS NULL;

ALTER TABLE "audit_logs" ALTER COLUMN "module" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "description" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "audit_logs_module_created_at_idx" ON "audit_logs"("module", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_id_created_at_idx" ON "audit_logs"("entity_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
