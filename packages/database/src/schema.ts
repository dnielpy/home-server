import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    photoPath: text("photo_path"),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_name_lower_unique").on(sql`lower(${table.name})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_index").on(table.userId),
    index("sessions_expires_at_index").on(table.expiresAt),
  ],
);

export const downloads = pgTable(
  "downloads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gid: text("gid").notNull(),
    url: text("url").notNull(),
    destination: text("destination").notNull(),
    fileName: text("file_name").notNull(),
    totalBytes: bigint("total_bytes", { mode: "number" }).notNull().default(0),
    completedBytes: bigint("completed_bytes", { mode: "number" }).notNull().default(0),
    status: text("status").notNull().default("waiting"),
    libraryStatus: text("library_status").notNull().default("pending"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("downloads_gid_unique").on(table.gid),
    index("downloads_user_id_index").on(table.userId),
    index("downloads_user_created_at_index").on(table.userId, table.createdAt),
  ],
);

export const downloadAttempts = pgTable(
  "download_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    downloadId: uuid("download_id")
      .notNull()
      .references(() => downloads.id, { onDelete: "cascade" }),
    gid: text("gid").notNull(),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("download_attempts_gid_unique").on(table.gid),
    index("download_attempts_download_id_index").on(table.downloadId),
  ],
);

export const networkTotals = pgTable("network_totals", {
  id: integer("id").primaryKey(),
  interfaceName: text("interface_name"),
  lastReceivedBytes: bigint("last_received_bytes", { mode: "number" }).notNull(),
  lastTransmittedBytes: bigint("last_transmitted_bytes", { mode: "number" }).notNull(),
  totalReceivedBytes: bigint("total_received_bytes", { mode: "number" }).notNull(),
  totalTransmittedBytes: bigint("total_transmitted_bytes", { mode: "number" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const stats = pgTable(
  "stats",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "date" }).notNull(),
    cpuUsed: real("cpu_used").notNull(),
    cpuIdle: real("cpu_idle").notNull(),
    memoryTotal: bigint("memory_total", { mode: "number" }).notNull(),
    memoryUsed: bigint("memory_used", { mode: "number" }).notNull(),
    memoryAvailable: bigint("memory_available", { mode: "number" }).notNull(),
    memoryPercentUsed: real("memory_percent_used").notNull(),
    systemStorageMount: text("system_storage_mount"),
    systemStorageTotal: bigint("system_storage_total", { mode: "number" }),
    systemStorageUsed: bigint("system_storage_used", { mode: "number" }),
    systemStorageAvailable: bigint("system_storage_available", { mode: "number" }),
    systemStoragePercentUsed: real("system_storage_percent_used"),
    externalStorageMount: text("external_storage_mount"),
    externalStorageTotal: bigint("external_storage_total", { mode: "number" }),
    externalStorageUsed: bigint("external_storage_used", { mode: "number" }),
    externalStorageAvailable: bigint("external_storage_available", { mode: "number" }),
    externalStoragePercentUsed: real("external_storage_percent_used"),
    networkInterfaceName: text("network_interface_name"),
    networkReceivedBytes: bigint("network_received_bytes", { mode: "number" }).notNull(),
    networkTransmittedBytes: bigint("network_transmitted_bytes", { mode: "number" }).notNull(),
    networkReceiveRate: real("network_receive_rate"),
    networkTransmitRate: real("network_transmit_rate"),
  },
  (table) => [index("stats_recorded_at_index").on(table.recordedAt)],
);
