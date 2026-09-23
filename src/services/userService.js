import apiClient from "./api";

class UserService {
  // 모든 사용자 목록 조회 (관리자 전용)
  async getAllUsers() {
    try {
      const response = await apiClient.request("/api/admin/users", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
        },
      });
      return response;
    } catch (error) {
      console.error("사용자 목록 조회 실패:", error);
      throw error;
    }
  }

  // 사용자 삭제
  async deleteUser(userId) {
    try {
      const response = await apiClient.request(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      return response;
    } catch (error) {
      console.error("사용자 삭제 실패:", error);
      throw error;
    }
  }

  // 사용자의 우분투 계정 회수(살아 있는 컨테이너를 모두 회수한 뒤 계정 삭제, 홈은 보존)
  async deleteUbuntuAccount(userId) {
    try {
      const response = await apiClient.request(`/api/admin/users/${userId}/ubuntu-account`, {
        method: "DELETE",
      });

      return response;
    } catch (error) {
      console.error("컨테이너 삭제 실패:", error);
      throw error;
    }
  }

  // 사용자가 속한 공용 그룹 목록
  async getUserGroups(userId) {
    try {
      const response = await apiClient.request(`/api/admin/users/${userId}/groups`, {
        method: "GET",
      });

      return response;
    } catch (error) {
      console.error("사용자 그룹 조회 실패:", error);
      throw error;
    }
  }

  // 사용자를 공용 그룹에서 제거(팀 폴더와 파일은 그대로 남는다)
  async removeUserFromGroup(userId, groupId) {
    try {
      const response = await apiClient.request(`/api/admin/users/${userId}/groups/${groupId}`, {
        method: "DELETE",
      });

      return response;
    } catch (error) {
      console.error("사용자 그룹 제거 실패:", error);
      throw error;
    }
  }

  // 사용자 임시 비활성화 (계정/컨테이너는 유지, 로그인만 차단)
  async deactivateUser(userId) {
    try {
      const response = await apiClient.request(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: false }),
      });

      return response;
    } catch (error) {
      console.error("사용자 비활성화 실패:", error);
      throw error;
    }
  }

  // 비활성화된 사용자 재활성화
  async reactivateUser(userId) {
    try {
      const response = await apiClient.request(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: true }),
      });

      return response;
    } catch (error) {
      console.error("사용자 재활성화 실패:", error);
      throw error;
    }
  }

  // 사용자 권한 변경 (ADMIN <-> USER)
  async changeUserRole(userId, role) {
    try {
      const response = await apiClient.request(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      return response;
    } catch (error) {
      console.error("사용자 권한 변경 실패:", error);
      throw error;
    }
  }
}

const userService = new UserService();
export default userService;
