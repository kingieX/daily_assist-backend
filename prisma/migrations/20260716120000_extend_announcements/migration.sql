ALTER TYPE "AudienceType" ADD VALUE IF NOT EXISTS 'BY_ZONE';
ALTER TYPE "AudienceType" ADD VALUE IF NOT EXISTS 'CAR_OWNER';

ALTER TABLE "announcements"
  ADD COLUMN "sender" TEXT NOT NULL DEFAULT 'Daily Assist Uk Office',
  ADD COLUMN "send_to" TEXT NOT NULL DEFAULT 'All Staff',
  ADD COLUMN "recipient_ids" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "zone" TEXT,
  ADD COLUMN "acknowledge_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "visit_summary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "visit_count" INTEGER,
  ADD COLUMN "first_visit_time" TEXT,
  ADD COLUMN "last_visit_time" TEXT;

ALTER TABLE "announcement_recipients"
  ADD COLUMN "acknowledged_at" TIMESTAMP(3);
