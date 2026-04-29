ALTER TABLE "ai_studio_generations"
ADD COLUMN "credits_bucket_allocations" jsonb DEFAULT '[]'::jsonb NOT NULL;
