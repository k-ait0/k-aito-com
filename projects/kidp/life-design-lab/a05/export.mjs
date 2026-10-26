/**
 * Explicit user-requested export. Never uploads data or automatically creates files.
 * Includes any raw answers still held in the new A05 IndexedDB.
 */
import { readExportSnapshot } from "./storage.mjs";

export async function exportA05Data(db) {
  const stores = await readExportSnapshot(db);
  return {
    schema: "A05-EXPORT-1",
    exportedAt: new Date().toISOString(),
    notice: "May include personal responses. Keep this file private.",
    stores
  };
}
