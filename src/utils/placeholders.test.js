import test from "node:test";
import assert from "node:assert/strict";
import { extractPlaceholders } from "./placeholders.js";

test("중복 없이 번호순으로 뽑는다", () => {
  assert.deepEqual(extractPlaceholders("{2} a {0} b {2} {10}"), [0, 2, 10]);
});

test("값이 없거나 문자열이 아니면 빈 배열", () => {
  assert.deepEqual(extractPlaceholders(null), []);
  assert.deepEqual(extractPlaceholders("자리표시자 없음"), []);
});
