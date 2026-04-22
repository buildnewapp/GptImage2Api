ALTER TYPE "public"."post_type" ADD VALUE 'use_case';--> statement-breakpoint
ALTER TYPE "public"."post_type" ADD VALUE 'template';--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "metadata_jsonb" jsonb;
