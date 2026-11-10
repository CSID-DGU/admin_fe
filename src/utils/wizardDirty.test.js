import test from "node:test";
import assert from "node:assert/strict";
import { isWizardDirty } from "./wizardDirty.js";

const initial = { purpose: "", server: "", gpu: [], date: "2026-11-24" };

test("initial state is not dirty", () => {
  assert.equal(isWizardDirty(initial, { ...initial, gpu: [] }), false);
});
test("one text field typed is dirty", () => {
  assert.equal(isWizardDirty(initial, { ...initial, purpose: "train" }), true);
});
test("whitespace-only text is not dirty", () => {
  assert.equal(isWizardDirty(initial, { ...initial, purpose: "   " }), false);
});
test("selection changed is dirty", () => {
  assert.equal(isWizardDirty(initial, { ...initial, gpu: ["A100"] }), true);
  assert.equal(isWizardDirty(initial, { ...initial, date: "2026-12-01" }), true);
});
test("changed then reverted is not dirty", () => {
  const changed = { ...initial, gpu: ["A100"], purpose: "x" };
  assert.equal(isWizardDirty(initial, changed), true);
  assert.equal(isWizardDirty(initial, { ...changed, gpu: [], purpose: "" }), false);
});
