import test from "node:test";
import assert from "node:assert/strict";
import { pickPendingRequest, pendingSummaryParts } from "./pendingRequest.js";

test("no requests", () => {
  assert.equal(pickPendingRequest([]), null);
  assert.equal(pickPendingRequest(undefined), null);
});

test("pending only", () => {
  const r = { requestId: 3, status: "PENDING" };
  assert.equal(pickPendingRequest([{ requestId: 1, status: "DENIED" }, r]), r);
});

test("PROCESSING counts as pending", () => {
  const r = { requestId: 4, status: "PROCESSING" };
  assert.equal(pickPendingRequest([r]), r);
});

test("pending + active: picks pending, ignores fulfilled", () => {
  const r = { requestId: 9, status: "PENDING" };
  assert.equal(pickPendingRequest([{ requestId: 2, status: "FULFILLED" }, r]), r);
  assert.equal(pickPendingRequest([{ requestId: 2, status: "FULFILLED" }]), null);
});

test("summary parts in order", () => {
  assert.deepEqual(
    pendingSummaryParts({ requestId: 7, serverName: "farm1", resourceGroupName: "RTX 3090", createdAt: "2026-11-10T01:02:03" }),
    ["#7", "farm1", "RTX 3090", "2026-11-10"],
  );
});

test("summary omits missing fields", () => {
  assert.deepEqual(pendingSummaryParts({ requestId: 7 }), ["#7"]);
  assert.deepEqual(pendingSummaryParts({ requestId: 7, serverName: "farm1" }), ["#7", "farm1"]);
});
