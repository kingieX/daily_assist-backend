ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "business_email" TEXT,
ADD COLUMN IF NOT EXISTS "dashboard_password" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_business_email_key" ON "public"."users"("business_email");
