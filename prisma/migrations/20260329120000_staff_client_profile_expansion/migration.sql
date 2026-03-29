CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

ALTER TABLE "users"
ADD COLUMN "staff_code" TEXT;

CREATE UNIQUE INDEX "users_staff_code_key" ON "users"("staff_code");

ALTER TABLE "staff_profiles"
ADD COLUMN "date_of_birth" TIMESTAMP(3),
ADD COLUMN "sex" "Sex",
ADD COLUMN "zone" TEXT,
ADD COLUMN "owns_car" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "cv_file_url" TEXT,
ADD COLUMN "staff_role_label" TEXT;

ALTER TABLE "clients"
ADD COLUMN "title" TEXT,
ADD COLUMN "age" INTEGER,
ADD COLUMN "sex" "Sex",
ADD COLUMN "emergency_contact_name" TEXT,
ADD COLUMN "emergency_contact_phone" TEXT,
ADD COLUMN "emergency_contact_relationship" TEXT,
ADD COLUMN "proof_of_address_url" TEXT,
ADD COLUMN "notes" TEXT;
