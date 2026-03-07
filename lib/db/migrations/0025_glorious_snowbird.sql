CREATE TYPE "public"."referral_invite_status" AS ENUM('registered', 'qualified_first_order', 'expired', 'rewarded');--> statement-breakpoint
CREATE TYPE "public"."referral_reward_status" AS ENUM('granted', 'locked', 'claimable', 'pending_withdraw', 'paid', 'revoked', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."referral_reward_type" AS ENUM('signup_credit', 'first_order_cash');--> statement-breakpoint
CREATE TYPE "public"."referral_withdraw_status" AS ENUM('pending', 'approved', 'paid', 'rejected');--> statement-breakpoint
CREATE TABLE "referral_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_user_id" uuid NOT NULL,
	"invitee_user_id" uuid NOT NULL,
	"invite_code_snapshot" text NOT NULL,
	"invite_link_snapshot" text,
	"status" "referral_invite_status" DEFAULT 'registered' NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"qualified_order_id" uuid,
	"qualified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_invites_invitee_user_id_unique" UNIQUE("invitee_user_id")
);
--> statement-breakpoint
CREATE TABLE "referral_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_user_id" uuid NOT NULL,
	"invitee_user_id" uuid NOT NULL,
	"referral_invite_id" uuid,
	"source_order_id" uuid,
	"reward_type" "referral_reward_type" NOT NULL,
	"status" "referral_reward_status" NOT NULL,
	"credit_amount" integer,
	"cash_amount_usd" numeric(10, 2),
	"cash_percent_snapshot" numeric(8, 2),
	"reward_config_snapshot" jsonb DEFAULT '{}' NOT NULL,
	"available_at" timestamp with time zone,
	"granted_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_withdraw_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_usd" numeric(10, 2) NOT NULL,
	"status" "referral_withdraw_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "invite_code" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "invited_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "invite_code_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "referral_invites" ADD CONSTRAINT "referral_invites_inviter_user_id_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_invites" ADD CONSTRAINT "referral_invites_invitee_user_id_user_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_invites" ADD CONSTRAINT "referral_invites_qualified_order_id_orders_id_fk" FOREIGN KEY ("qualified_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_inviter_user_id_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_invitee_user_id_user_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referral_invite_id_referral_invites_id_fk" FOREIGN KEY ("referral_invite_id") REFERENCES "public"."referral_invites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_source_order_id_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_withdraw_requests" ADD CONSTRAINT "referral_withdraw_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_referral_invites_inviter_user_id" ON "referral_invites" USING btree ("inviter_user_id");--> statement-breakpoint
CREATE INDEX "idx_referral_invites_invitee_user_id" ON "referral_invites" USING btree ("invitee_user_id");--> statement-breakpoint
CREATE INDEX "idx_referral_invites_status" ON "referral_invites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_referral_rewards_inviter_user_id" ON "referral_rewards" USING btree ("inviter_user_id");--> statement-breakpoint
CREATE INDEX "idx_referral_rewards_invitee_user_id" ON "referral_rewards" USING btree ("invitee_user_id");--> statement-breakpoint
CREATE INDEX "idx_referral_rewards_reward_type" ON "referral_rewards" USING btree ("reward_type");--> statement-breakpoint
CREATE INDEX "idx_referral_rewards_status" ON "referral_rewards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_referral_rewards_source_order_id" ON "referral_rewards" USING btree ("source_order_id");--> statement-breakpoint
CREATE INDEX "idx_referral_withdraw_requests_user_id" ON "referral_withdraw_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_referral_withdraw_requests_status" ON "referral_withdraw_requests" USING btree ("status");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_invite_code_unique" UNIQUE("invite_code");