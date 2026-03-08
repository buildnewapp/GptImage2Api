CREATE TYPE "public"."ai_studio_generation_status" AS ENUM('created', 'submitted', 'queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "ai_studio_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"catalog_model_id" varchar(255) NOT NULL,
	"category" varchar(32) NOT NULL,
	"title_snapshot" varchar(255) NOT NULL,
	"provider_snapshot" varchar(255) NOT NULL,
	"endpoint_snapshot" varchar(255) NOT NULL,
	"method_snapshot" varchar(16) NOT NULL,
	"provider_task_id" varchar(255),
	"status" "ai_studio_generation_status" DEFAULT 'created' NOT NULL,
	"provider_state" varchar(64),
	"status_reason" text,
	"request_payload" jsonb NOT NULL,
	"response_payload" jsonb,
	"callback_payload" jsonb,
	"result_urls" jsonb,
	"official_pricing_snapshot" jsonb,
	"credits_reserved" integer DEFAULT 0 NOT NULL,
	"credits_captured" integer DEFAULT 0 NOT NULL,
	"credits_refunded" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_studio_generations_provider_task_id_unique" UNIQUE("provider_task_id")
);
--> statement-breakpoint
ALTER TABLE "ai_studio_generations" ADD CONSTRAINT "ai_studio_generations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_studio_generations_user_id" ON "ai_studio_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_studio_generations_catalog_model_id" ON "ai_studio_generations" USING btree ("catalog_model_id");--> statement-breakpoint
CREATE INDEX "idx_ai_studio_generations_provider_task_id" ON "ai_studio_generations" USING btree ("provider_task_id");--> statement-breakpoint
CREATE INDEX "idx_ai_studio_generations_status" ON "ai_studio_generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ai_studio_generations_created_at" ON "ai_studio_generations" USING btree ("created_at");