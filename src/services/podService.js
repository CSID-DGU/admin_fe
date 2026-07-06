import apiClient from "./api.js";
import { authService } from "./authService.js";

export const podService = {
  // 관리자용 모든 Pod 목록 조회
  getAllPods: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/admin/pods", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "Pod 목록 조회에 실패했습니다.");
    }
  },

  // 관리자용 Pod 상세 조회
  getPod: async (podName) => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request(`/api/admin/pods/${podName}`, {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "Pod 상세 조회에 실패했습니다.");
    }
  },

  // 관리자용 활성 컨테이너 목록 조회
  getActiveContainers: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/admin/requests/containers", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "활성 컨테이너 조회에 실패했습니다.");
    }
  },

  // 관리자용 사용량 조회
  getUsage: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/admin/requests/usage", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "사용량 조회에 실패했습니다.");
    }
  },
};
