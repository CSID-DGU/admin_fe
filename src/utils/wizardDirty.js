// True when any field differs from its initial value; strings compare trimmed, arrays by JSON.
export function isWizardDirty(initial, current) {
  const norm = (v) => (typeof v === "string" ? v.trim() : JSON.stringify(v));
  return Object.keys(initial).some((k) => norm(initial[k]) !== norm(current[k]));
}
