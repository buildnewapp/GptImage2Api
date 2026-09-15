CREATE TYPE "public"."email_send_status" AS ENUM('sending', 'sent', 'failed', 'unknown');--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_email" text NOT NULL,
	"from_email" text,
	"from_name" text,
	"subject" text NOT NULL,
	"template_key" text NOT NULL,
	"variables" jsonb NOT NULL,
	"provider" text NOT NULL,
	"status" "email_send_status" DEFAULT 'sending' NOT NULL,
	"provider_message_id" text,
	"delivery_status" text,
	"error_message" text,
	"job_id" uuid,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_logs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE INDEX "idx_email_logs_created_at" ON "email_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_email_logs_recipient_created_at" ON "email_logs" USING btree ("to_email","created_at");--> statement-breakpoint
CREATE INDEX "idx_email_logs_status_created_at" ON "email_logs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_email_logs_template_created_at" ON "email_logs" USING btree ("template_key","created_at");--> statement-breakpoint
CREATE INDEX "idx_email_logs_job_id" ON "email_logs" USING btree ("job_id");