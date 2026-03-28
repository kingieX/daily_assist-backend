-- Ensure one admin-staff conversation per staff user
CREATE UNIQUE INDEX "conversations_type_staff_id_key"
ON "conversations"("type", "staff_id");

-- Notification preferences per user
CREATE TABLE "notification_preferences" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "email_enabled" BOOLEAN NOT NULL DEFAULT true,
  "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
  "message_enabled" BOOLEAN NOT NULL DEFAULT true,
  "announcement_enabled" BOOLEAN NOT NULL DEFAULT true,
  "visit_enabled" BOOLEAN NOT NULL DEFAULT true,
  "system_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_user_id_key"
ON "notification_preferences"("user_id");

ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
