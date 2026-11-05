import test from "node:test";
import assert from "node:assert/strict";
import { formatLocalCompletionDay as format } from "../projects/kidp/life-design-lab/a05/format.mjs";

test("D-50 Tokyo viewer sees next calendar day at UTC+9 midnight crossing", () => {
  assert.equal(format("2026-10-25T15:00:00.000Z", "Asia/Tokyo"), "2026-10-26");
  assert.equal(format("2026-10-25T14:59:59.999Z", "Asia/Tokyo"), "2026-10-25");
  assert.equal(format("2026-10-26T00:00:00.000Z", "Asia/Tokyo"), "2026-10-26");
});

test("D-50 one snapshot instant displays local date without mutating UTC timestamp", () => {
  const timestamp = "2026-10-25T15:30:00.000Z";
  assert.equal(format(timestamp, "Asia/Tokyo"), "2026-10-26");
  assert.equal(format(timestamp, "UTC"), "2026-10-25");
  assert.equal(format(timestamp, "America/Los_Angeles"), "2026-10-25");
  assert.equal(timestamp, "2026-10-25T15:30:00.000Z");
});

test("D-50 time zone conversion handles leap days and year boundaries", () => {
  assert.equal(format("2028-02-28T15:00:00.000Z", "Asia/Tokyo"), "2028-02-29");
  assert.equal(format("2026-12-31T15:01:00.000Z", "Asia/Tokyo"), "2027-01-01");
  assert.equal(format("2027-01-01T00:30:00.000Z", "America/Los_Angeles"), "2026-12-31");
});

test("D-50 invalid timestamps are safely shown as unknown dates", () => {
  for(const bad of ["", "not a date", "2026-13-40", "2026-02-30Q", null, undefined, 0, {}])
    assert.equal(format(bad, "Asia/Tokyo"), "日付不明");
});

test("D-50 default formatting respects process/browser timezone", () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = "Asia/Tokyo";
    assert.equal(format("2026-10-25T15:30:00Z"), "2026-10-26");
    process.env.TZ = "UTC";
    assert.equal(format("2026-10-25T15:30:00Z"), "2026-10-25");
  } finally {
    if(original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
