import test from "node:test";
import assert from "node:assert/strict";
import { formatGroupValue } from "./groupValue.js";

const options = [{ ubuntuGid: 1001, groupName: "lab-a" }, { ubuntuGid: 1002, groupName: "lab-b" }];

test("gid 배열과 JSON 문자열을 그룹명으로 바꾼다", () => {
  assert.equal(formatGroupValue([1001, 1002], options), "lab-a, lab-b");
  assert.equal(formatGroupValue("[1001]", options), "lab-a");
});

test("모르는 gid, 빈 값, 잘못된 JSON", () => {
  assert.equal(formatGroupValue([999], options), "GID 999");
  assert.equal(formatGroupValue("[]", options), "");
  assert.equal(formatGroupValue("abc", options), "abc");
  assert.equal(formatGroupValue(null, options), null);
});
