CREATE TABLE "subscription_credit_buckets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" "provider" NOT NULL,
  "subscription_id" text NOT NULL,
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "credits_total" integer NOT NULL,
  "credits_remaining" integer NOT NULL,
  "related_order_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_credit_buckets" ADD CONSTRAINT "subscription_credit_buckets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "subscription_credit_buckets" ADD CONSTRAINT "subscription_credit_buckets_related_order_id_orders_id_fk" FOREIGN KEY ("related_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_subscription_credit_buckets_user_id" ON "subscription_credit_buckets" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_subscription_credit_buckets_expires_at" ON "subscription_credit_buckets" USING btree ("expires_at");
--> statement-breakpoint
ALTER TABLE "subscription_credit_buckets" ADD CONSTRAINT "subscription_credit_buckets_subscription_period_unique" UNIQUE("provider","subscription_id","period_start");
