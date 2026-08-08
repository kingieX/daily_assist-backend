-- Add notification delivery audit records for dashboard, email, and websocket fan-out.
CREATE TYPE "public"."NotificationDeliveryChannel" AS ENUM ('DASHBOARD', 'EMAIL', 'WEBSOCKET');
CREATE TYPE "public"."NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "public"."notification_deliveries" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT,
    "user_id" TEXT NOT NULL,
    "channel" "public"."NotificationDeliveryChannel" NOT NULL,
    "status" "public"."NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_deliveries_notification_id_idx" ON "public"."notification_deliveries"("notification_id");
CREATE INDEX "notification_deliveries_user_id_channel_status_idx" ON "public"."notification_deliveries"("user_id", "channel", "status");

ALTER TABLE "public"."notification_deliveries"
ADD CONSTRAINT "notification_deliveries_notification_id_fkey"
FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."notification_deliveries"
ADD CONSTRAINT "notification_deliveries_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
