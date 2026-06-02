import apiClient from "./api.js";
import { authService } from "./authService.js";

// 서버 요청 관련 API 서비스
export const requestService = {
  // 서버 신청
  createRequest: async (requestData) => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/requests", {
        method: "POST",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify(requestData),
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "서버 신청에 실패했습니다.");
    }
  },

  // 리소스 그룹 목록 조회
  getResourceGroups: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/resources/groups", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "리소스 그룹 조회에 실패했습니다.");
    }
  },

  // 컨테이너 이미지 목록 조회
  getContainerImages: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/images", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "컨테이너 이미지 조회에 실패했습니다.");
    }
  },

  // 사용자의 요청 목록 조회
  getUserRequests: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/requests/my", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "요청 목록 조회에 실패했습니다.");
    }
  },

  // 관리자용 모든 요청 목록 조회
  getAllRequests: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/admin/requests", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "모든 요청 목록 조회에 실패했습니다.");
    }
  },

  // 관리자용 요청 승인
  approveRequest: async (requestData) => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request(`/api/admin/requests/approve`, {
        method: "PATCH",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify(requestData),
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "요청 승인에 실패했습니다.");
    }
  },

  // 관리자용 요청 거절
  rejectRequest: async (requestData) => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request(`/api/admin/requests/reject`, {
        method: "PATCH",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify(requestData),
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "요청 거절에 실패했습니다.");
    }
  },

  // 관리자용 요청 상태 업데이트 (기존 함수 - 호환성 유지)
  updateRequestStatus: async (requestId, status, comment = "") => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request(
        `/api/admin/requests/${requestId}`,
        {
          method: "PATCH",
          headers: {
            accept: "application/json;charset=UTF-8",
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json;charset=UTF-8",
          },
          body: JSON.stringify({
            status: status,
            comment: comment,
          }),
        }
      );
      return response;
    } catch (error) {
      throw new Error(error.message || "요청 상태 업데이트에 실패했습니다.");
    }
  },

  // 요청 변경 신청
  createChangeRequest: async (requestId, changeRequestData) => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request(`/api/requests/${requestId}/change`, {
        method: "POST",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify(changeRequestData),
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "변경 요청에 실패했습니다.");
    }
  },

  // 모든 변경 요청 목록 조회 (관리자용)
  getChangeRequests: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/admin/requests/change/all", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "변경 요청 목록 조회에 실패했습니다.");
    }
  },

  // 변경 요청 승인 (관리자용)
  approveChangeRequest: async (changeRequestId, adminComment) => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/admin/requests/change/approve", {
        method: "PATCH",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          changeRequestId: changeRequestId,
          adminComment: adminComment,
        }),
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "변경 요청 승인에 실패했습니다.");
    }
  },

  // 변경 요청 거절 (관리자용)
  rejectChangeRequest: async (changeRequestId, adminComment) => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/admin/requests/change/reject", {
        method: "PATCH",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          changeRequestId: changeRequestId,
          adminComment: adminComment,
        }),
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "변경 요청 거절에 실패했습니다.");
    }
  },

  // 내 변경 요청 목록 조회 (사용자용)
  getMyChangeRequests: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/requests/my/changes", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "변경 요청 목록 조회에 실패했습니다.");
    }
  },

  // GPU 타입 목록 조회 (server_name별로 분리된 리소스 목록)
  getGpuTypes: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/resources/gpu-types", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "GPU 타입 조회에 실패했습니다.");
    }
  },

  // 그룹 목록 조회
  getGroups: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/groups", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "그룹 목록 조회에 실패했습니다.");
    }
  },

  // 새 그룹 생성
  createGroup: async (groupName) => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/groups", {
        method: "POST",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          groupName: groupName,
        }),
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "그룹 생성에 실패했습니다.");
    }
  },

  // 대시보드 서버 목록 조회
  getDashboardServers: async (status = "ALL") => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request(
        `/api/dashboard/me/servers?status=${status}`,
        {
          method: "GET",
          headers: {
            accept: "application/json;charset=UTF-8",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response;
    } catch (error) {
      throw new Error(error.message || "대시보드 서버 조회에 실패했습니다.");
    }
  },

  // 승인된 서버 목록 조회
  getApprovedRequests: async () => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/requests/my/approved", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      throw new Error(error.message || "승인된 서버 목록 조회에 실패했습니다.");
    }
  },
};
