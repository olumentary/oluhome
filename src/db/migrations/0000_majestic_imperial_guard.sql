CREATE TYPE "public"."acquisition_type" AS ENUM('purchase', 'gift', 'inheritance', 'trade');--> statement-breakpoint
CREATE TYPE "public"."ai_analysis_type" AS ENUM('identify', 'condition', 'provenance', 'value_estimate');--> statement-breakpoint
CREATE TYPE "public"."field_type" AS ENUM('text', 'textarea', 'number', 'boolean', 'select', 'multi_select', 'date', 'url');--> statement-breakpoint
CREATE TYPE "public"."item_condition" AS ENUM('excellent', 'very_good', 'good', 'fair', 'poor');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('active', 'sold', 'gifted', 'stored', 'on_loan');--> statement-breakpoint
CREATE TYPE "public"."share_scope" AS ENUM('item', 'room', 'collection');--> statement-breakpoint
CREATE TYPE "public"."user_plan" AS ENUM('free', 'pro', 'premium', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."valuation_purpose" AS ENUM('insurance', 'estate', 'sale', 'donation', 'personal');--> statement-breakpoint
CREATE TYPE "public"."valuation_type" AS ENUM('estimated', 'appraised', 'insured', 'auction_estimate', 'retail');--> statement-breakpoint
CREATE TYPE "public"."vendor_type" AS ENUM('dealer', 'auction_house', 'private', 'estate_sale', 'flea_market', 'gallery', 'other');--> statement-breakpoint
CREATE TABLE "acquisitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"vendor_id" uuid,
	"acquisition_date" date,
	"listed_price" numeric(10, 2),
	"purchase_price" numeric(10, 2),
	"buyers_premium_pct" numeric(5, 2),
	"tax_amount" numeric(10, 2),
	"shipping_cost" numeric(10, 2),
	"total_cost" numeric(10, 2),
	"lot_number" varchar(255),
	"sale_name" varchar(500),
	"acquisition_type" "acquisition_type",
	"receipt_s3_key" varchar(1024),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"analysis_type" "ai_analysis_type" NOT NULL,
	"prompt_used" text,
	"response" jsonb,
	"model_version" varchar(128),
	"photo_ids" text[],
	"applied" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_item_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(64),
	"field_schema" jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_type_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"period" varchar(255),
	"style" varchar(255),
	"origin_country" varchar(255),
	"origin_region" varchar(255),
	"maker_attribution" varchar(500),
	"materials" text[],
	"condition" "item_condition",
	"condition_notes" text,
	"height" numeric(10, 2),
	"width" numeric(10, 2),
	"depth" numeric(10, 2),
	"diameter" numeric(10, 2),
	"weight" numeric(10, 2),
	"room" varchar(255),
	"position_in_room" varchar(255),
	"custom_fields" jsonb,
	"provenance_narrative" text,
	"provenance_references" text,
	"notes" text,
	"tags" text[],
	"status" "item_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"label" varchar(255) NOT NULL,
	"height" numeric(10, 2),
	"width" numeric(10, 2),
	"depth" numeric(10, 2),
	"diameter" numeric(10, 2),
	"notes" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"s3_key" varchar(1024) NOT NULL,
	"thumbnail_key" varchar(1024),
	"original_filename" varchar(512),
	"content_type" varchar(128),
	"caption" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"width_px" integer,
	"height_px" integer,
	"file_size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_limits" (
	"plan" "user_plan" PRIMARY KEY NOT NULL,
	"max_items" integer NOT NULL,
	"max_photos_per_item" integer NOT NULL,
	"max_storage_mb" integer NOT NULL,
	"max_custom_types" integer NOT NULL,
	"ai_analyses_per_month" integer NOT NULL,
	"pdf_exports_per_month" integer NOT NULL,
	"share_links_enabled" boolean DEFAULT false NOT NULL,
	"batch_pdf_enabled" boolean DEFAULT false NOT NULL,
	"analytics_enabled" boolean DEFAULT false NOT NULL,
	"priority_support" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(21) NOT NULL,
	"scope" "share_scope" NOT NULL,
	"scope_id" varchar(255) NOT NULL,
	"recipient_email" varchar(255),
	"recipient_name" varchar(255),
	"expires_at" timestamp with time zone,
	"include_values" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp with time zone,
	CONSTRAINT "share_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "usage_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period" varchar(7) NOT NULL,
	"items_count" integer DEFAULT 0 NOT NULL,
	"photos_count" integer DEFAULT 0 NOT NULL,
	"storage_bytes" bigint DEFAULT 0 NOT NULL,
	"ai_analyses_count" integer DEFAULT 0 NOT NULL,
	"pdf_exports_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_tracking_user_id_period_uniq" UNIQUE("user_id","period")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'owner' NOT NULL,
	"plan" "user_plan" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"plan_valid_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"valuation_type" "valuation_type" NOT NULL,
	"value_low" numeric(12, 2),
	"value_high" numeric(12, 2),
	"value_single" numeric(12, 2),
	"appraiser_name" varchar(255),
	"appraiser_credentials" varchar(500),
	"valuation_date" date,
	"purpose" "valuation_purpose",
	"notes" text,
	"document_s3_key" varchar(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"business_name" varchar(255),
	"type" "vendor_type",
	"email" varchar(255),
	"phone" varchar(64),
	"website" varchar(512),
	"address" text,
	"specialty" text,
	"notes" text,
	"rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acquisitions" ADD CONSTRAINT "acquisitions_item_id_collection_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."collection_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisitions" ADD CONSTRAINT "acquisitions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_item_id_collection_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."collection_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_item_types" ADD CONSTRAINT "collection_item_types_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_item_type_id_collection_item_types_id_fk" FOREIGN KEY ("item_type_id") REFERENCES "public"."collection_item_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_measurements" ADD CONSTRAINT "item_measurements_item_id_collection_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."collection_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_item_id_collection_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."collection_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_tokens" ADD CONSTRAINT "share_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_item_id_collection_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."collection_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acquisitions_item_id_idx" ON "acquisitions" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "acquisitions_vendor_id_idx" ON "acquisitions" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "collection_item_types_user_id_idx" ON "collection_item_types" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "collection_items_user_id_idx" ON "collection_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "collection_items_item_type_id_idx" ON "collection_items" USING btree ("item_type_id");--> statement-breakpoint
CREATE INDEX "collection_items_room_idx" ON "collection_items" USING btree ("room");--> statement-breakpoint
CREATE INDEX "collection_items_status_idx" ON "collection_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "item_photos_item_id_display_order_idx" ON "item_photos" USING btree ("item_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "share_tokens_token_idx" ON "share_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "valuations_item_id_valuation_date_idx" ON "valuations" USING btree ("item_id","valuation_date");--> statement-breakpoint
CREATE INDEX "vendors_user_id_idx" ON "vendors" USING btree ("user_id");