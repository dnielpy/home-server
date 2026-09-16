CREATE TABLE "downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gid" text NOT NULL,
	"url" text NOT NULL,
	"destination" text NOT NULL,
	"file_name" text NOT NULL,
	"total_bytes" bigint DEFAULT 0 NOT NULL,
	"completed_bytes" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"library_status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "download_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"download_id" uuid NOT NULL,
	"gid" text NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "download_attempts" ADD CONSTRAINT "download_attempts_download_id_downloads_id_fk" FOREIGN KEY ("download_id") REFERENCES "public"."downloads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "downloads_gid_unique" ON "downloads" USING btree ("gid");
--> statement-breakpoint
CREATE INDEX "downloads_user_id_index" ON "downloads" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "downloads_user_created_at_index" ON "downloads" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "download_attempts_gid_unique" ON "download_attempts" USING btree ("gid");
--> statement-breakpoint
CREATE INDEX "download_attempts_download_id_index" ON "download_attempts" USING btree ("download_id");
