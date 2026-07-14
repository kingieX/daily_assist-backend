CREATE TABLE "job_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "report_to" TEXT NOT NULL DEFAULT '',
    "pay_rate" TEXT NOT NULL DEFAULT '',
    "contract_types" JSONB NOT NULL DEFAULT '[]',
    "hours" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "overview" TEXT NOT NULL DEFAULT '',
    "responsibilities" JSONB NOT NULL DEFAULT '[]',
    "exclusions" JSONB NOT NULL DEFAULT '[]',
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "desirable" JSONB NOT NULL DEFAULT '[]',
    "standards" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_posts_created_at_idx" ON "job_posts"("created_at");
