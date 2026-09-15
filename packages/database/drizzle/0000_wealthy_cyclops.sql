CREATE TABLE "stats" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"recorded_at" timestamp with time zone NOT NULL,
	"cpu_used" real NOT NULL,
	"cpu_idle" real NOT NULL,
	"memory_total" bigint NOT NULL,
	"memory_used" bigint NOT NULL,
	"memory_available" bigint NOT NULL,
	"memory_percent_used" real NOT NULL,
	"system_storage_mount" text,
	"system_storage_total" bigint,
	"system_storage_used" bigint,
	"system_storage_available" bigint,
	"system_storage_percent_used" real,
	"external_storage_mount" text,
	"external_storage_total" bigint,
	"external_storage_used" bigint,
	"external_storage_available" bigint,
	"external_storage_percent_used" real,
	"network_interface_name" text,
	"network_received_bytes" bigint NOT NULL,
	"network_transmitted_bytes" bigint NOT NULL,
	"network_receive_rate" real,
	"network_transmit_rate" real
);
--> statement-breakpoint
CREATE INDEX "stats_recorded_at_index" ON "stats" USING btree ("recorded_at");