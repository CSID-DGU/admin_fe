import apiClient from "./api.js";

// 신청·승인 API. 인증과 공통 오류 처리는 apiClient가 담당합니다.
export const requestService = {
  createRequest: (data) => apiClient.post("/api/requests", data),
  getResourceGroups: () => apiClient.get("/api/resources/groups"),
  getContainerImages: () => apiClient.get("/api/images"),
  getUserRequests: () => apiClient.get("/api/requests/my"),
  getAllRequests: () => apiClient.get("/api/admin/requests"),

  approveRequest: (data) =>
    apiClient.patch("/api/admin/requests/approve", data, {
      // 계정과 Pod 생성까지 동기 처리되어 백엔드 제한(5분)보다 조금 길게 대기합니다.
      signal: AbortSignal.timeout(310_000),
    }),
  rejectRequest: (data) => apiClient.patch("/api/admin/requests/reject", data),

  createChangeRequest: (requestId, data) =>
    apiClient.post(`/api/requests/${requestId}/change`, data),
  getChangeRequests: () => apiClient.get("/api/admin/requests/change/all"),
  approveChangeRequest: (changeRequestId, adminComment) =>
    apiClient.patch("/api/admin/requests/change/approve", {
      changeRequestId,
      adminComment,
    }),
  rejectChangeRequest: (changeRequestId, adminComment) =>
    apiClient.patch("/api/admin/requests/change/reject", {
      changeRequestId,
      adminComment,
    }),
  getMyChangeRequests: () => apiClient.get("/api/requests/my/changes"),

  getGpuTypes: () => apiClient.get("/api/resources/gpu-types"),
  getGroups: () => apiClient.get("/api/groups"),
  checkUbuntuUsername: (username) =>
    apiClient.get("/api/requests/config/check-username", { username }),
  createGroup: (groupName, ubuntuUsername) =>
    apiClient.post("/api/groups", {
      groupName,
      ...(ubuntuUsername && { ubuntuUsername }),
    }),
  getDashboardServers: (status = "ALL") =>
    apiClient.get("/api/dashboard/me/servers", { status }),
  getApprovedRequests: () => apiClient.get("/api/requests/my/approved"),
};
