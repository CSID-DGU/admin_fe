import apiClient from "./api.js";

// 신청·승인 API. 인증과 공통 오류 처리는 apiClient가 담당합니다.
export const requestService = {
  createRequest: (data) => apiClient.post("/api/requests", data),
  getResourceGroups: () => apiClient.get("/api/resources/groups"),
  getContainerImages: () => apiClient.get("/api/images"),
  getUserRequests: () => apiClient.get("/api/requests/my"),
  getAllRequests: () => apiClient.get("/api/admin/requests"),
  // 신청의 생성·회수 작업 단계 기록(신청 상세). 관리자 API로만 받는다.
  getJobSteps: (requestId) =>
    apiClient.get(`/api/admin/requests/${encodeURIComponent(requestId)}/job-steps`),

  // 승인은 생성 작업을 등록하고 바로 202로 돌아온다. 결과는 신청 상태 폴링으로 판정한다.
  approveRequest: (requestId, { imageId, resourceGroupId, adminComment }) =>
    apiClient.post(`/api/admin/requests/${encodeURIComponent(requestId)}/approval`, {
      imageId,
      resourceGroupId,
      adminComment,
    }),
  rejectRequest: (requestId, adminComment) =>
    apiClient.post(`/api/admin/requests/${encodeURIComponent(requestId)}/rejection`, { adminComment }),

  createChangeRequest: (requestId, data) =>
    apiClient.post(`/api/requests/${requestId}/change`, data),
  getChangeRequests: () => apiClient.get("/api/admin/change-requests"),
  approveChangeRequest: (changeRequestId, adminComment) =>
    apiClient.post(`/api/admin/change-requests/${encodeURIComponent(changeRequestId)}/approval`, { adminComment }),
  rejectChangeRequest: (changeRequestId, adminComment) =>
    apiClient.post(`/api/admin/change-requests/${encodeURIComponent(changeRequestId)}/rejection`, { adminComment }),
  getMyChangeRequests: () => apiClient.get("/api/requests/my/changes"),

  // 마이그레이션은 작업을 등록하고 바로 202로 돌아온다. 끝났는지는 신청 상태(MIGRATING → FULFILLED)와
  // 마지막 마이그레이션 결과로 확인한다.
  migrateRequest: (requestId, nodes, minImprovementRatio, force) =>
    apiClient.post(`/api/admin/requests/${encodeURIComponent(requestId)}/migrations`, {
      nodes,
      ...(minImprovementRatio != null && { minImprovementRatio }),
      ...(force && { force }),
    }),
  getLatestMigration: (requestId) =>
    apiClient.get(`/api/admin/requests/${encodeURIComponent(requestId)}/migrations/latest`),

  // 컨테이너 하나만 회수한다. 우분투 계정·홈 디렉터리와 같은 사용자의 다른 컨테이너는 그대로 둔다.
  // 계정까지 회수하려면 userService.deleteUbuntuAccount를 쓴다 — 그쪽은 컨테이너를 전부 정리한다.
  deleteContainer: (requestId) =>
    apiClient.request(`/api/admin/requests/${encodeURIComponent(requestId)}/container`, {
      method: "DELETE",
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
