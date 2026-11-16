CREATE TABLE "gardens" (
	"garden_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"garden_name" varchar(100) NOT NULL,
	"total_surface_area" double precision NOT NULL,
	"location_description" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gardens_name_not_blank" CHECK (char_length(btrim("garden_name")) >= 1),
	CONSTRAINT "gardens_total_surface_area_non_negative" CHECK ("total_surface_area" >= 0)
);
--> statement-breakpoint
ALTER TABLE "gardens" ADD CONSTRAINT "gardens_user_id_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE;