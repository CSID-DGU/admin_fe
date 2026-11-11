// 승인·거절이 아직 정해지지 않은 신청 상태. 이런 신청이 있으면 서버가 새 신청을 받지 않는다.
export const AWAITING_STATUSES = ["PENDING", "PROCESSING"];

export function pickPendingRequest(requests) {
  return (requests ?? []).find((request) => AWAITING_STATUSES.includes(request.status)) ?? null;
}

// "#번호 · 서버 · GPU · 신청일" 조각. 값이 없는 조각은 뺀다.
export function pendingSummaryParts(activity) {
  return [
    activity.requestId != null ? `#${activity.requestId}` : null,
    activity.serverName,
    activity.resourceGroupName,
    activity.createdAt ? String(activity.createdAt).slice(0, 10) : null,
  ].filter(Boolean);
}
