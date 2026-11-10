import apiClient from "./api.js";

export const gpuUsageService = {
  // node를 주지 않으면 전체 노드. 없는 노드는 404, 지표 수집 실패는 502.
  getGpuUsage: (node) => apiClient.get("/api/admin/gpu-usage", { params: node ? { node } : undefined }),
};
