CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"age" smallint,
	"email_address" varchar(254) NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_first_name_not_blank" CHECK (char_length(btrim("first_name")) >= 1),
	CONSTRAINT "users_last_name_not_blank" CHECK (char_length(btrim("last_name")) >= 1),
	CONSTRAINT "users_age_non_negative" CHECK ("age" >= 0)
);
