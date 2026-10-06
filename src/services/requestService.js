import apiClient from "./api.js";

// 신청·승인 API. 인증과 공통 오류 처리는 apiClient가 담당합니다.
export const requestService = {
  createRequest: (data) => apiClient.post("/api/requests", data),
  getResourceGroups: () => apiClient.get("/api/resources/groups"),
  getContainerImages: () => apiClient.get("/api/images"),
  getUserRequests: () => apiClient.get("/api/requests/my"),
  // 승인 대기·거절 상태인 내 신청을 취소한다. 승인을 기다리는 신청은 한 건만 둘 수 있어, 바꾸려면 취소하고 다시 낸다.
  cancelRequest: (requestId) =>
    apiClient.request(`/api/requests/${encodeURIComponent(requestId)}`, { method: "DELETE" }),
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

  // 재시작은 현재 노드에서 컨테이너를 다시 만드는 작업이다. 마이그레이션처럼 작업만 등록하고 202로 돌아온다.
  // keepChanges가 false면 설치한 내용을 버리고 기본 이미지로 초기화한다.
  restartContainer: (requestId, keepChanges) =>
    apiClient.post(`/api/admin/requests/${encodeURIComponent(requestId)}/restarts`, { keepChanges }),
  restartMyContainer: (requestId, keepChanges) =>
    apiClient.post(`/api/requests/${encodeURIComponent(requestId)}/restarts`, { keepChanges }),
  getMyLatestRestart: (requestId) =>
    apiClient.get(`/api/requests/${encodeURIComponent(requestId)}/restarts/latest`),

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
  // 그룹은 바로 생긴다(201, gid 없음 — 승인 대기 그룹). 인프라 그룹은 이 그룹을 고른 신청이 승인될 때 만들어진다.
  createGroup: (groupName) => apiClient.post("/api/groups", { groupName }),
  getGroupOperation: (operationId) =>
    apiClient.get(`/api/groups/operations/${encodeURIComponent(operationId)}`),
  getDashboardServers: (status = "ALL") =>
    apiClient.get("/api/dashboard/me/servers", { status }),
  getApprovedRequests: () => apiClient.get("/api/requests/my/approved"),
};
