import { db, sql } from "./index";
import { runMigrations } from "./migrations";

const executeMigrations = async () => {
  try {
    await runMigrations();
  } finally {
    await sql.end();
  }
};

void executeMigrations();
