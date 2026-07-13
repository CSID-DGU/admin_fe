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
}

const userService = new UserService();
export default userService;
