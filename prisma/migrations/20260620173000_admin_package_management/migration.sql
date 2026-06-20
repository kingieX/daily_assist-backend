ALTER TABLE "public"."packages"
ADD COLUMN "price" TEXT,
ADD COLUMN "duration" TEXT,
ADD COLUMN "icon" TEXT,
ADD COLUMN "tagline" TEXT,
ADD COLUMN "features" JSONB,
ADD COLUMN "additional_charge" TEXT,
ADD COLUMN "highlighted" BOOLEAN NOT NULL DEFAULT false;
