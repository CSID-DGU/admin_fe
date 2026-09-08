import apiClient from "./api.js";

export const podService = {
  getAllPods: () => apiClient.get("/api/admin/pods"),
  getPod: (podName) => apiClient.get(`/api/admin/pods/${encodeURIComponent(podName)}`),
  getPodLogs: (podName, container) =>
    apiClient.get(`/api/admin/pods/${encodeURIComponent(podName)}/logs`, container ? { container } : undefined),
  getPodEvents: (podName) => apiClient.get(`/api/admin/pods/${encodeURIComponent(podName)}/events`),
  // 한 사용자가 컨테이너를 여러 개 동시에 신청할 수 있어, username이 아니라 requestId로
  // 진행 상황을 조회한다 — 그래야 서로 다른 신청의 진행 상황이 안 섞인다.
  getProvisioningStatus: (requestId) => apiClient.get(`/pod-status/requests/${encodeURIComponent(requestId)}/status`),
  getActiveContainers: () => apiClient.get("/api/admin/requests/containers"),
  getUsage: () => apiClient.get("/api/admin/requests/usage"),
};
