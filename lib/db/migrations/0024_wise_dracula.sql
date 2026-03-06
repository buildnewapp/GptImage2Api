CREATE TYPE "public"."video_generation_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TABLE "video_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" varchar(255) NOT NULL,
	"model" varchar(100) NOT NULL,
	"status" "video_generation_status" DEFAULT 'pending' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"credits_used" integer NOT NULL,
	"credits_refunded" boolean DEFAULT false NOT NULL,
	"input_params" jsonb NOT NULL,
	"result_urls" jsonb,
	"fail_code" varchar(100),
	"fail_msg" text,
	"cost_time" integer,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_generations_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
ALTER TABLE "video_generations" ADD CONSTRAINT "video_generations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_video_generations_user_id" ON "video_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_video_generations_task_id" ON "video_generations" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_video_generations_status" ON "video_generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_video_generations_is_public" ON "video_generations" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "idx_video_generations_model" ON "video_generations" USING btree ("model");--> statement-breakpoint
CREATE INDEX "idx_video_generations_created_at" ON "video_generations" USING btree ("created_at");