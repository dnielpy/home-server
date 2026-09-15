CREATE TABLE "network_totals" (
	"id" integer PRIMARY KEY NOT NULL,
	"interface_name" text,
	"last_received_bytes" bigint NOT NULL,
	"last_transmitted_bytes" bigint NOT NULL,
	"total_received_bytes" bigint NOT NULL,
	"total_transmitted_bytes" bigint NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
WITH ordered_stats AS (
	SELECT
		"network_interface_name",
		"network_received_bytes",
		"network_transmitted_bytes",
		"recorded_at",
		"id",
		LAG("network_interface_name") OVER (ORDER BY "recorded_at", "id") AS "previous_interface_name",
		LAG("network_received_bytes") OVER (ORDER BY "recorded_at", "id") AS "previous_received_bytes",
		LAG("network_transmitted_bytes") OVER (ORDER BY "recorded_at", "id") AS "previous_transmitted_bytes"
	FROM "stats"
), historical_totals AS (
	SELECT
		COALESCE(SUM(
			CASE
				WHEN "previous_received_bytes" IS NULL
					OR "network_interface_name" IS DISTINCT FROM "previous_interface_name"
					OR "network_received_bytes" < "previous_received_bytes"
				THEN "network_received_bytes"
				ELSE "network_received_bytes" - "previous_received_bytes"
			END
		), 0)::bigint AS "total_received_bytes",
		COALESCE(SUM(
			CASE
				WHEN "previous_transmitted_bytes" IS NULL
					OR "network_interface_name" IS DISTINCT FROM "previous_interface_name"
					OR "network_transmitted_bytes" < "previous_transmitted_bytes"
				THEN "network_transmitted_bytes"
				ELSE "network_transmitted_bytes" - "previous_transmitted_bytes"
			END
		), 0)::bigint AS "total_transmitted_bytes"
	FROM ordered_stats
), latest_stats AS (
	SELECT
		"network_interface_name",
		"network_received_bytes",
		"network_transmitted_bytes",
		"recorded_at"
	FROM "stats"
	ORDER BY "recorded_at" DESC, "id" DESC
	LIMIT 1
)
INSERT INTO "network_totals" (
	"id",
	"interface_name",
	"last_received_bytes",
	"last_transmitted_bytes",
	"total_received_bytes",
	"total_transmitted_bytes",
	"updated_at"
)
SELECT
	1,
	latest_stats."network_interface_name",
	latest_stats."network_received_bytes",
	latest_stats."network_transmitted_bytes",
	historical_totals."total_received_bytes",
	historical_totals."total_transmitted_bytes",
	latest_stats."recorded_at"
FROM latest_stats
CROSS JOIN historical_totals
ON CONFLICT ("id") DO NOTHING;
