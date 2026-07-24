CREATE TYPE "public"."reward_application_source" AS ENUM('system', 'user');--> statement-breakpoint
CREATE TYPE "public"."reward_application_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "reward_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_key" varchar(64) NOT NULL,
	"source" "reward_application_source" NOT NULL,
	"status" "reward_application_status" NOT NULL,
	"credit_amount" integer NOT NULL,
	"evidence_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submission_text" text,
	"ip_hash" varchar(64),
	"device_hash" varchar(64),
	"risk_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"review_note" text,
	"reviewed_by_user_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reward_applications" ADD CONSTRAINT "reward_applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_applications" ADD CONSTRAINT "reward_applications_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reward_applications_user_task" ON "reward_applications" USING btree ("user_id","task_key");--> statement-breakpoint
CREATE INDEX "idx_reward_applications_user_source_task_submitted_at" ON "reward_applications" USING btree ("user_id","source","task_key","submitted_at");--> statement-breakpoint
CREATE INDEX "idx_reward_applications_task_status_submitted_at" ON "reward_applications" USING btree ("task_key","status","submitted_at");--> statement-breakpoint
CREATE INDEX "idx_reward_applications_ip_submitted_at" ON "reward_applications" USING btree ("ip_hash","submitted_at") WHERE "reward_applications"."task_key" = 'signup_bonus' and "reward_applications"."status" = 'approved' and "reward_applications"."ip_hash" is not null;--> statement-breakpoint
CREATE INDEX "idx_reward_applications_device_submitted_at" ON "reward_applications" USING btree ("device_hash","submitted_at") WHERE "reward_applications"."task_key" = 'signup_bonus' and "reward_applications"."status" = 'approved' and "reward_applications"."device_hash" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reward_applications_user_task_active_unique" ON "reward_applications" USING btree ("user_id","task_key") WHERE "reward_applications"."status" in ('pending', 'approved');
