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
      // 타임아웃 체인: config-server(500s) < admin_be(550s) < nginx/ingress(570s)
      // < 여기(프론트, 600s=10분 — 사용자에게 보여주는 안내 문구와도 일치시킨다).
      // 짧게 잡으면 백엔드가 아직 정상 처리 중인데 프론트가 먼저 포기해버린다.
      signal: AbortSignal.timeout(600_000),
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

  migrateRequest: (requestId, nodes, minImprovementRatio, force) =>
    apiClient.post(`/api/admin/requests/${requestId}/migrate`, {
      nodes,
      ...(minImprovementRatio != null && { minImprovementRatio }),
      ...(force && { force }),
    }, {
      // nginx/ingress 프록시 타임아웃(570s)보다 길게 잡아야 백엔드가 정상
      // 처리 중일 때 프론트가 먼저 타임아웃돼버리는 걸 막을 수 있다.
      signal: AbortSignal.timeout(600_000),
    }),

  // 컨테이너(신청) 개별 삭제 — userService.deleteUbuntuAccount(username)는 그 유저네임에
  // 딸린 살아있는 신청을 전부 지우므로, 한 사용자가 컨테이너를 여러 개 가진 상태에서 이걸
  // 개별 삭제에 쓰면 안 된다. requestId로 정확히 이 컨테이너 하나만 지운다.
  deleteContainer: (requestId) =>
    apiClient.delete(`/api/admin/requests/${requestId}`, {
      signal: AbortSignal.timeout(600_000),
    }),

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
