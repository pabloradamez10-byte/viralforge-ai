-- Faceless scripts (roteiros gerados)
CREATE TABLE "faceless_scripts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "source_platform" TEXT NOT NULL,
    "source_video_id" TEXT NOT NULL,
    "source_title" TEXT NOT NULL,
    "source_url" TEXT,
    "niche" TEXT,
    "tone" TEXT NOT NULL,
    "target_duration" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "narration" TEXT NOT NULL,
    "scenes" JSONB NOT NULL,
    "captions" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "thumbnail_suggestion" TEXT NOT NULL,
    "estimated_duration_sec" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "faceless_scripts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "faceless_scripts_user_id_created_at_idx" ON "faceless_scripts"("user_id", "created_at" DESC);
CREATE INDEX "faceless_scripts_source_video_id_idx" ON "faceless_scripts"("source_video_id");
ALTER TABLE "faceless_scripts" ADD CONSTRAINT "faceless_scripts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "faceless_scripts" ADD CONSTRAINT "faceless_scripts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL;
