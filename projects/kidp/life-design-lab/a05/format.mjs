/**
 * Read-only display helper: render an ISO completion instant as a calendar
 * date in the viewing browser's timezone, not its UTC date component.
 * Optional timezone is for deterministic, synthetic-only unit tests.
 * No change to stored ISO timestamps or scored result snapshots.
 */
export function formatLocalCompletionDay(value, timeZone) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    return "日付不明";
  }
  const options = { year: "numeric", month: "2-digit", day: "2-digit" };
  if (timeZone !== undefined) options.timeZone = timeZone;
  const parts = new Intl.DateTimeFormat("ja-JP", options).formatToParts(new Date(value));
  const part = type => parts.find(item => item.type === type)?.value;
  const year = part("year"), month = part("month"), day = part("day");
  return year && month && day ? year + "-" + month + "-" + day : "日付不明";
}
