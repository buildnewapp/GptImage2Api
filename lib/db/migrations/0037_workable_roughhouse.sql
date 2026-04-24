CREATE TYPE "public"."prompt_gallery_status" AS ENUM('draft', 'online', 'offline');--> statement-breakpoint

CREATE TABLE "prompt_gallery_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "prompt_gallery_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"categories" jsonb DEFAULT '[]' NOT NULL,
	"model" varchar(100) NOT NULL,
	"source_id" integer,
	"title" text NOT NULL,
	"description" text,
	"source_link" text,
	"source_published_at" timestamp with time zone,
	"source_platform" varchar(50),
	"author" jsonb DEFAULT '{}' NOT NULL,
	"cover_url" text,
	"input_videos" jsonb DEFAULT '[]' NOT NULL,
	"input_images" jsonb DEFAULT '[]' NOT NULL,
	"input_audios" jsonb DEFAULT '[]' NOT NULL,
	"prompt" text NOT NULL,
	"note" text,
	"featured" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"search_index" text DEFAULT '' NOT NULL,
	"ups" integer DEFAULT 0 NOT NULL,
	"downs" integer DEFAULT 0 NOT NULL,
	"status" "prompt_gallery_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_prompt_gallery_items_language" ON "prompt_gallery_items" USING btree ("language");--> statement-breakpoint
CREATE INDEX "idx_prompt_gallery_items_model" ON "prompt_gallery_items" USING btree ("model");--> statement-breakpoint
CREATE INDEX "idx_prompt_gallery_items_source_id" ON "prompt_gallery_items" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_prompt_gallery_items_featured" ON "prompt_gallery_items" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "idx_prompt_gallery_items_sort" ON "prompt_gallery_items" USING btree ("sort");--> statement-breakpoint
CREATE INDEX "idx_prompt_gallery_items_status" ON "prompt_gallery_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_prompt_gallery_items_source_published_at" ON "prompt_gallery_items" USING btree ("source_published_at");