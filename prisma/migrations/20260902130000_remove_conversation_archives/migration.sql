ALTER TABLE "conversations"
  DROP COLUMN IF EXISTS "admin_archived_at",
  DROP COLUMN IF EXISTS "staff_archived_at";
