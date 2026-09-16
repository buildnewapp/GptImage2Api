ALTER TABLE "orders" ADD COLUMN "checkout_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "recall_registered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "recall_paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Preserve old accounts' registration dates; normal profile updates must not enroll them again.
UPDATE "user" SET "recall_registered_at" = "created_at"
WHERE "email_verified" = true AND "is_anonymous" = false;
