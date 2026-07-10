-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PRO', 'AGENCY', 'ENTERPRISE');
CREATE TYPE "SourceType" AS ENUM ('GOOGLE_TRENDS', 'YOUTUBE', 'REDDIT', 'TIKTOK', 'GOOGLE_NEWS', 'RSS', 'HACKERNEWS');
CREATE TYPE "InsightKind" AS ENUM ('GROWTH', 'DECLINE', 'OPPORTUNITY', 'SATURATION', 'EMERGING', 'ALERT', 'STRATEGY');
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'GENERATED', 'ARCHIVED');

-- CreateTable users
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateTable refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- CreateTable projects
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "niche" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- CreateTable sources
CREATE TABLE "sources" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "base_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sources_slug_key" ON "sources"("slug");

-- CreateTable categories
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL;

-- CreateTable trend_searches
CREATE TABLE "trend_searches" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "query" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'global',
    "language" TEXT NOT NULL DEFAULT 'en',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trend_searches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trend_searches_user_id_created_at_idx" ON "trend_searches"("user_id", "created_at" DESC);
CREATE INDEX "trend_searches_query_idx" ON "trend_searches"("query");
ALTER TABLE "trend_searches" ADD CONSTRAINT "trend_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "trend_searches" ADD CONSTRAINT "trend_searches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL;

-- CreateTable trend_records
CREATE TABLE "trend_records" (
    "id" UUID NOT NULL,
    "search_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "category_id" UUID,
    "external_id" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    CONSTRAINT "trend_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trend_records_source_id_collected_at_idx" ON "trend_records"("source_id", "collected_at" DESC);
CREATE INDEX "trend_records_search_id_idx" ON "trend_records"("search_id");
CREATE INDEX "trend_records_title_idx" ON "trend_records"("title");
ALTER TABLE "trend_records" ADD CONSTRAINT "trend_records_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "trend_searches"("id") ON DELETE CASCADE;
ALTER TABLE "trend_records" ADD CONSTRAINT "trend_records_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id");
ALTER TABLE "trend_records" ADD CONSTRAINT "trend_records_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");

-- CreateTable trend_metrics
CREATE TABLE "trend_metrics" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "search_id" UUID NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "growth_pct" INTEGER NOT NULL DEFAULT 0,
    "decline_pct" INTEGER NOT NULL DEFAULT 0,
    "competition_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "opportunity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seasonality_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lifetime_days" INTEGER NOT NULL DEFAULT 0,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "time_series" JSONB NOT NULL DEFAULT '[]',
    "snapshot_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trend_metrics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "trend_metrics_record_id_snapshot_date_key" ON "trend_metrics"("record_id", "snapshot_date");
CREATE INDEX "trend_metrics_snapshot_date_record_id_idx" ON "trend_metrics"("snapshot_date", "record_id");
CREATE INDEX "trend_metrics_opportunity_score_idx" ON "trend_metrics"("opportunity_score" DESC);
ALTER TABLE "trend_metrics" ADD CONSTRAINT "trend_metrics_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "trend_records"("id") ON DELETE CASCADE;
ALTER TABLE "trend_metrics" ADD CONSTRAINT "trend_metrics_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "trend_searches"("id") ON DELETE CASCADE;

-- CreateTable insights
CREATE TABLE "insights" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "search_id" UUID,
    "kind" "InsightKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "insights_user_id_created_at_idx" ON "insights"("user_id", "created_at" DESC);
ALTER TABLE "insights" ADD CONSTRAINT "insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "insights" ADD CONSTRAINT "insights_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL;
ALTER TABLE "insights" ADD CONSTRAINT "insights_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "trend_searches"("id") ON DELETE SET NULL;

-- CreateTable content_plans
CREATE TABLE "content_plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "search_id" UUID,
    "title" TEXT NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'GENERATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_plans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "content_plans_user_id_created_at_idx" ON "content_plans"("user_id", "created_at" DESC);
ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL;
ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "trend_searches"("id") ON DELETE SET NULL;

-- CreateTable content_ideas
CREATE TABLE "content_ideas" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "video_structure" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "content_ideas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "content_ideas_plan_id_position_key" ON "content_ideas"("plan_id", "position");
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "content_plans"("id") ON DELETE CASCADE;

-- CreateTable user_api_keys
CREATE TABLE "user_api_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "encrypted_key" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_api_keys_user_id_source_id_label_key" ON "user_api_keys"("user_id", "source_id", "label");
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE;

-- CreateTable audit_logs
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
