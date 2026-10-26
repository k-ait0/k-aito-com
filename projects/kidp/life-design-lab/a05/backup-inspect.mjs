/**
 * A05-EXPORT-1 local JSON file structural inspection only.
 * This module never imports/restores data, accesses storage or transmits data.
 * A passing result is NOT cryptographic integrity, scoring or identity proof.
 */
export const A05_BACKUP_STORES = Object.freeze([
  "drafts", "history", "preferences", "migrations", "legacyBackups"
]);
export const A05_BACKUP_MAX_BYTES = 10 * 1024 * 1024;

export function inspectA05Backup(value) {
  const reject = reason => Object.freeze({
    ok: false, reason, counts: null, total: 0,
    restored: false, verifiedIntegrity: false
  });
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return reject("JSONの最上位がオブジェクトではありません。");
  }
  if (value.schema !== "A05-EXPORT-1") {
    return reject("A05-EXPORT-1形式ではありません。");
  }
  if (typeof value.exportedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value.exportedAt) ||
      !Number.isFinite(Date.parse(value.exportedAt)) ||
      new Date(value.exportedAt).toISOString() !== value.exportedAt) {
    return reject("書き出し日時が不正です。");
  }
  const stores = value.stores;
  if (!stores || typeof stores !== "object" || Array.isArray(stores)) {
    return reject("保存領域の一覧が不正です。");
  }
  const keys = Object.keys(stores).sort();
  if (keys.length !== A05_BACKUP_STORES.length ||
      A05_BACKUP_STORES.some(k => !Object.hasOwn(stores, k))) {
    return reject("保存領域の種類が不足または追加されています。");
  }
  const counts = {};
  let total = 0;
  for (const name of A05_BACKUP_STORES) {
    const records = stores[name];
    if (!Array.isArray(records) || records.length > 100000) {
      return reject("保存領域の件数または配列形式が不正です。");
    }
    const ids = new Set();
    for (const record of records) {
      if (!record || typeof record !== "object" || Array.isArray(record) ||
          typeof record.id !== "string" || record.id.length === 0 ||
          ids.has(record.id)) {
        return reject("同一領域の識別子に欠損・重複があります。");
      }
      ids.add(record.id);
    }
    counts[name] = records.length;
    total += records.length;
  }
  return Object.freeze({
    ok: true, reason: null, counts: Object.freeze(counts), total,
    restored: false, verifiedIntegrity: false
  });
}
