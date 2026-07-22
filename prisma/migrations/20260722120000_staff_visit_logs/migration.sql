CREATE TABLE "public"."visit_logs" (
    "id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "visit_types" JSONB NOT NULL DEFAULT '[]',
    "other_service" TEXT NOT NULL DEFAULT '',
    "miles" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "visit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "visit_logs_visit_id_key" ON "public"."visit_logs"("visit_id");
CREATE INDEX "visit_logs_staff_id_submitted_at_idx" ON "public"."visit_logs"("staff_id", "submitted_at");
ALTER TABLE "public"."visit_logs" ADD CONSTRAINT "visit_logs_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."visit_logs" ADD CONSTRAINT "visit_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
