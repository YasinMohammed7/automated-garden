CREATE TABLE "realtime_plant_metrics" (
	"plant_id" uuid PRIMARY KEY,
	"current_humidity_level" smallint NOT NULL,
	"last_irrigation_start_time" timestamp with time zone,
	"last_irrigation_end_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "realtime_plant_metrics_current_humidity_level_range" CHECK ("current_humidity_level" >= 0 and "current_humidity_level" <= 100)
);
--> statement-breakpoint
ALTER TABLE "realtime_plant_metrics" ADD CONSTRAINT "realtime_plant_metrics_plant_id_plants_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("plant_id") ON DELETE CASCADE;