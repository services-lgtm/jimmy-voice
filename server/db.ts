import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Lazily create the Drizzle SQLite instance.
 * The database file lives at the path in DATABASE_URL (e.g. "file:./local.db"),
 * so no cloud connection or password is needed.
 */
export function getDb() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL ?? "file:./local.db";
  const filename = url.replace(/^file:/, "");

  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  _db = drizzle(sqlite);
  return _db;
}
