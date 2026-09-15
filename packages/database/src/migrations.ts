import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./index";

export const runMigrations = async () => {
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "../drizzle") });
};
