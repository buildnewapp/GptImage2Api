CREATE TABLE "task_reward_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_key" varchar(50) NOT NULL,
	"claim_key" varchar(120) NOT NULL,
	"credit_amount" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_reward_claims_claim_key_unique" UNIQUE("claim_key")
);
--> statement-breakpoint
ALTER TABLE "task_reward_claims" ADD CONSTRAINT "task_reward_claims_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_task_reward_claims_user_id" ON "task_reward_claims" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_task_reward_claims_task_key" ON "task_reward_claims" USING btree ("task_key");--> statement-breakpoint
CREATE INDEX "idx_task_reward_claims_claimed_at" ON "task_reward_claims" USING btree ("claimed_at");