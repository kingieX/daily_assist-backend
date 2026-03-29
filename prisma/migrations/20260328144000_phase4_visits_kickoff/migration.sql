-- CreateEnum
CREATE TYPE "public"."VisitStatus" AS ENUM ('ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."VisitEventType" AS ENUM ('ASSIGNED', 'REASSIGNED', 'ACKNOWLEDGED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'COMPLETED', 'NOTE_UPDATED');

-- CreateTable
CREATE TABLE "public"."visits" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "scheduled_start_at" TIMESTAMP(3) NOT NULL,
    "scheduled_end_at" TIMESTAMP(3) NOT NULL,
    "status" "public"."VisitStatus" NOT NULL DEFAULT 'ASSIGNED',
    "acknowledged_at" TIMESTAMP(3),
    "check_in_at" TIMESTAMP(3),
    "check_out_at" TIMESTAMP(3),
    "admin_notes" TEXT,
    "staff_notes" TEXT,
    "completion_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."visit_events" (
    "id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "event_type" "public"."VisitEventType" NOT NULL,
    "payload_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visits_booking_id_idx" ON "public"."visits"("booking_id");

-- CreateIndex
CREATE INDEX "visits_staff_id_status_idx" ON "public"."visits"("staff_id", "status");

-- CreateIndex
CREATE INDEX "visit_events_visit_id_created_at_idx" ON "public"."visit_events"("visit_id", "created_at");

-- CreateIndex
CREATE INDEX "visit_events_actor_user_id_idx" ON "public"."visit_events"("actor_user_id");

-- AddForeignKey
ALTER TABLE "public"."visits" ADD CONSTRAINT "visits_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."visits" ADD CONSTRAINT "visits_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."visit_events" ADD CONSTRAINT "visit_events_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."visit_events" ADD CONSTRAINT "visit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
