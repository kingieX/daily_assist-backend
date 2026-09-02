ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "admin_archived_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "staff_archived_at" TIMESTAMP(3);
