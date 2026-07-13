// 백엔드 /api/monitoring/metrics를 통해 Prometheus 지표를 조회하는 서비스
import apiClient from "./api";

export const monitoringService = {
  getMetrics: () => apiClient.get("/api/monitoring/metrics"),
};
