CREATE TYPE "plant_type" AS ENUM('vegetable', 'fruit', 'flower');--> statement-breakpoint
CREATE TABLE "plants" (
	"plant_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plant_name" varchar(100) NOT NULL,
	"species" varchar(100) NOT NULL,
	"plant_type" "plant_type" NOT NULL,
	"plantation_date" date NOT NULL,
	"surface_area_required" double precision NOT NULL,
	"ideal_humidity_level" smallint NOT NULL,
	"garden_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plants_name_not_blank" CHECK (char_length(btrim("plant_name")) >= 1),
	CONSTRAINT "plants_species_not_blank" CHECK (char_length(btrim("species")) >= 1),
	CONSTRAINT "plants_surface_area_required_non_negative" CHECK ("surface_area_required" >= 0),
	CONSTRAINT "plants_ideal_humidity_level_range" CHECK ("ideal_humidity_level" >= 0 and "ideal_humidity_level" <= 100)
);
--> statement-breakpoint
CREATE INDEX "gardens_user_id_idx" ON "gardens" ("user_id");--> statement-breakpoint
CREATE INDEX "plants_garden_id_idx" ON "plants" ("garden_id");--> statement-breakpoint
ALTER TABLE "plants" ADD CONSTRAINT "plants_garden_id_gardens_garden_id_fkey" FOREIGN KEY ("garden_id") REFERENCES "gardens"("garden_id") ON DELETE CASCADE;