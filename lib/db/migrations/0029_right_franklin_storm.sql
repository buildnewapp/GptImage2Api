CREATE TABLE "cache_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" varchar(80) NOT NULL,
	"cache_key" varchar(128) NOT NULL,
	"value_jsonb" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cache_db_namespace_cache_key_unique" UNIQUE("namespace","cache_key")
);
--> statement-breakpoint
CREATE INDEX "idx_cache_db_expires_at" ON "cache_db" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_cache_db_consumed_at" ON "cache_db" USING btree ("consumed_at");