import apiClient from "./api";

const JSON_HEADERS = { "Content-Type": "application/json" };

// 응답 본문은 모두 같은 경고 현황이다: { count, deductible, nextSuspensionDays, suspendedUntil, history }
const statusOf = (response) => response.data?.data ?? null;

/** 경고 부여·차감·취소와 현황 조회. 경고가 쌓이면 서버가 계정의 컨테이너 접속을 정해진 기간 동안 막는다. */
export const warningService = {
  async getUserWarnings(userId) {
    return statusOf(await apiClient.request(`/api/admin/users/${userId}/warnings`, { method: "GET" }));
  },

  async grant(userId, reason) {
    return statusOf(await apiClient.request(`/api/admin/users/${userId}/warnings`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ reason }),
    }));
  },

  async deduct(userId, reason) {
    return statusOf(await apiClient.request(`/api/admin/users/${userId}/warning-deductions`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ reason }),
    }));
  },

  // 사유는 쿼리로 보낸다 — DELETE 본문은 중간 프록시가 버릴 수 있다.
  async cancel(userId, warningId, reason) {
    return statusOf(await apiClient.request(
      `/api/admin/users/${userId}/warnings/${warningId}?reason=${encodeURIComponent(reason)}`,
      { method: "DELETE" },
    ));
  },

  async getMyWarnings() {
    return statusOf(await apiClient.request("/api/users/me/warnings", { method: "GET" }));
  },
};

/** 서버의 시각(초 단위 ISO 문자열)을 분 단위로 보여 준다. */
export const formatWarningTime = (value) => (value ? String(value).slice(0, 16).replace("T", " ") : "—");
