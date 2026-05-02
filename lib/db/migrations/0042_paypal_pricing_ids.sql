ALTER TABLE "pricing_plans" ADD COLUMN "paypal_product_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "pricing_plans" ADD COLUMN "paypal_plan_id" varchar(255);
--> statement-breakpoint
UPDATE "pricing_plans"
SET "paypal_plan_id" = "creem_product_id"
WHERE "provider" = 'paypal'
  AND "paypal_plan_id" IS NULL
  AND "creem_product_id" LIKE 'P-%';
--> statement-breakpoint
UPDATE "pricing_plans"
SET "creem_product_id" = NULL
WHERE "provider" = 'paypal'
  AND "creem_product_id" LIKE 'P-%';
