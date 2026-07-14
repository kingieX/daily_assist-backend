ALTER TABLE "public"."worker_applications"
ADD COLUMN "applicant_number" SERIAL,
ADD COLUMN "role" TEXT NOT NULL DEFAULT 'Home-Help & Support Assistant Role',
ADD COLUMN "staff_code" TEXT,
ADD COLUMN "cv_file_name" TEXT,
ADD COLUMN "cv_file_size" INTEGER;

CREATE UNIQUE INDEX "worker_applications_applicant_number_key" ON "public"."worker_applications"("applicant_number");
CREATE UNIQUE INDEX "worker_applications_staff_code_key" ON "public"."worker_applications"("staff_code");
