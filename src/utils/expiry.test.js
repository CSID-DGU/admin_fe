import test from "node:test";
import assert from "node:assert/strict";
import { daysLeft, expiryState, localDate } from "./expiry.js";

// BE는 시간대 없는 LocalDateTime("2026-11-10T17:09:01")을 준다. 기준 시각도 로컬로 둔다.
const now = new Date(2026, 10, 10, 10, 0, 0);

test("later today is today, not 1 day", () => {
  assert.equal(daysLeft("2026-11-10T17:09:01", now), 0);
  assert.equal(daysLeft("2026-11-10T23:59:59", now), 0);
  assert.equal(expiryState(0), "today");
});

test("earlier today (already passed) is still today", () => {
  assert.equal(daysLeft("2026-11-10T00:00:01", now), 0);
});

test("future dates count calendar days", () => {
  assert.equal(daysLeft("2026-11-11T00:00:00", now), 1);
  assert.equal(daysLeft("2026-11-13T09:00:00", now), 3);
  assert.equal(expiryState(1), "future");
});

test("past dates are negative calendar days", () => {
  assert.equal(daysLeft("2026-11-09T23:59:59", now), -1);
  assert.equal(daysLeft("2026-10-05T17:09:01", now), -36);
  assert.equal(expiryState(-36), "past");
});

test("month and year boundaries", () => {
  assert.equal(daysLeft("2026-12-01T12:00:00", now), 21);
  assert.equal(daysLeft("2027-01-01T00:00:00", new Date(2026, 11, 31, 23, 59)), 1);
});

test("invalid or missing date returns null", () => {
  assert.equal(daysLeft("nope", now), null);
  assert.equal(daysLeft(undefined, now), null);
  assert.equal(daysLeft(null, now), null);
  assert.equal(expiryState(null), null);
});

test("localDate uses the local calendar day, not UTC", () => {
  // 로컬 00:30은 UTC로는 전날일 수 있다(KST 등). 표시는 로컬 날짜여야 한다.
  assert.equal(localDate(new Date(2026, 10, 10, 0, 30)), "2026-11-10");
  assert.equal(localDate(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(localDate("2026-11-10T05:00:00"), "2026-11-10");
  assert.equal(localDate("nope"), null);
  assert.equal(localDate(null), null);
});
