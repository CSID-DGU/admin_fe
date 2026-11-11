// 만료일까지 남은 달력 일수(로컬 날짜 기준). 오늘 만료는 0, 지난 날짜는 음수, 날짜가 없거나 잘못되면 null.
export function daysLeft(dateStr, now = new Date()) {
  if (dateStr == null) return null;
  const expiresAt = new Date(dateStr);
  if (Number.isNaN(expiresAt.getTime())) return null;
  // 로컬 연·월·일만 UTC 자정으로 옮겨 비교해 시각·서머타임 영향을 없앤다
  const dayOf = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((dayOf(expiresAt) - dayOf(now)) / 86400000);
}

/** @returns {"past" | "today" | "future" | null} */
export function expiryState(days) {
  if (days == null) return null;
  if (days < 0) return "past";
  return days === 0 ? "today" : "future";
}

// 로컬 달력 날짜 "YYYY-MM-DD". 날짜가 없거나 잘못되면 null.
export function localDate(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
