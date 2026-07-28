ALTER TYPE "public"."provider" ADD VALUE 'subotiz' BEFORE 'paypal';--> statement-breakpoint
ALTER TABLE "pricing_plans" ADD COLUMN "subotiz_price_id" varchar(255);