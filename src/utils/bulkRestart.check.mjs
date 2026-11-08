// 일괄 재시작 자체 점검 — `node src/utils/bulkRestart.check.mjs`
import assert from "node:assert";
import { restartEach } from "./bulkRestart.js";

const calls = [];
const results = await restartEach([1, 2, 3], async (n) => {
  calls.push(n);
  if (n === 2) throw Object.assign(new Error("conflict"), { status: 409 });
});
assert.deepEqual(calls, [1, 2, 3]); // 중간 실패에도 끝까지, 순서대로
assert.deepEqual(results.map((r) => r.ok), [true, false, true]);
assert.equal(results[1].error.status, 409);
assert.deepEqual(await restartEach([], async () => { throw new Error("no"); }), []);
console.log("bulkRestart check ok");
