/**
 * Add SQLite tables here as your features grow.
 *
 * Example:
 *   import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
 *
 *   export const savedCarts = sqliteTable("saved_carts", {
 *     id: integer("id").primaryKey({ autoIncrement: true }),
 *     name: text("name").notNull(),
 *     payload: text("payload").notNull(),
 *     createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
 *   });
 *   export type SavedCart = typeof savedCarts.$inferSelect;
 */

// No tables yet — this export keeps the file a module for `export type *`.
export {};
