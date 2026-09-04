ALTER TABLE "orders" DROP CONSTRAINT "orders_plan_id_pricing_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_plan_id_pricing_plans_id_fk";
