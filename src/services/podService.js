import apiClient from "./api.js";

export const podService = {
  getAllPods: () => apiClient.get("/api/admin/pods"),
  getPodLogs: (podName, container) =>
    apiClient.get(`/api/admin/pods/${encodeURIComponent(podName)}/logs`, container ? { container } : undefined),
  getPodEvents: (podName) => apiClient.get(`/api/admin/pods/${encodeURIComponent(podName)}/events`),
  // 한 사용자가 컨테이너를 여러 개 동시에 신청할 수 있어, username이 아니라 requestId로
  // 진행 상황을 조회한다 — 그래야 서로 다른 신청의 진행 상황이 안 섞인다.
  // 응답의 data.data가 { stage, message }다.
  getProvisioningStatus: (requestId) =>
    apiClient.get(`/api/admin/requests/${encodeURIComponent(requestId)}/provisioning-status`),
  // 상태는 admin_be가 5분마다 읽어 둔 값이 함께 온다(statusCheckedAt이 읽은 시각).
  getActiveContainers: () => apiClient.get("/api/admin/requests/containers"),
  // 주기 갱신을 기다리지 않고 지금 다시 읽게 한다. 10초 안에 다시 부르면 직전 값을 쓴다.
  refreshPodStatus: () => apiClient.post("/api/admin/pods/status-refresh"),
  getUsage: () => apiClient.get("/api/admin/requests/usage"),
};
