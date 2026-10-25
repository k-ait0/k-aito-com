/**
 * Explicit user-requested export. Never uploads data or automatically creates files.
 * Includes any raw answers still held in the new A05 IndexedDB.
 */
import { readAll } from "./storage.mjs";

export async function exportA05Data(db) {
  const names = ["drafts", "history", "preferences", "migrations", "legacyBackups"];
  const contents = await Promise.all(names.map(name => readAll(db, name)));
  return {
    schema: "A05-EXPORT-1",
    exportedAt: new Date().toISOString(),
    notice: "May include personal responses. Keep this file private.",
    stores: Object.fromEntries(names.map((name, index) => [name, contents[index]]))
  };
}
