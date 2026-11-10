// 메시지 템플릿에서 쓰인 {n} 자리표시자 번호를 오름차순으로 돌려준다.
export function extractPlaceholders(text) {
  if (typeof text !== "string") return [];
  const nums = [...text.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
  return [...new Set(nums)].sort((a, b) => a - b);
}
