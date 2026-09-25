import apiClient from "./api.js";
import { tokenStorage } from "./tokenStorage";

// 토큰 헤더는 apiClient가 붙인다. 여기서는 토큰이 없을 때 요청 전에 막기만 한다.
function requireAccessToken() {
  if (!tokenStorage.getAccessToken()) {
    throw new Error("인증 토큰이 없습니다.");
  }
}

// 인증 관련 API 서비스
export const authService = {
  // 토큰 관리
  setTokens: tokenStorage.setTokens,
  getAccessToken: tokenStorage.getAccessToken,
  getRefreshToken: tokenStorage.getRefreshToken,
  clearTokens: tokenStorage.clear,

  // 이메일 인증번호 발송
  sendEmailVerification: async (email) => {
    try {
      const response = await apiClient.post("/api/auth/email/send", {
        email,
      });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "인증번호 전송에 실패했습니다.");
    }
  },

  // 이메일 인증번호 검증
  verifyEmailCode: async (email, code) => {
    try {
      const response = await apiClient.post("/api/auth/email/verify", {
        email,
        code,
      });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "인증번호 검증에 실패했습니다.");
    }
  },

  // 회원가입
  register: async (userData) => {
    try {
      const response = await apiClient.post("/api/auth/register", {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        department: userData.department,
        studentId: userData.studentId,
        phone: userData.phone,
        ubuntuUsername: userData.ubuntuUsername,
      });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "회원가입에 실패했습니다.");
    }
  },

  // 로그인
  login: async (email, password) => {
    try {
      const response = await apiClient.request("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
        skipSessionExpiredCheck: true, // 로그인 요청은 세션 만료 체크 제외
      });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "로그인에 실패했습니다.");
    }
  },

  // 사용자 정보 조회
  getUserInfo: async () => {
    try {
      requireAccessToken();
      const response = await apiClient.get("/api/users/me");
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "사용자 정보 조회에 실패했습니다.");
    }
  },

  // 휴대폰 번호 변경
  updatePhone: async (newPhone) => {
    try {
      requireAccessToken();
      const response = await apiClient.patch("/api/users/me/phone", { newPhone });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "휴대폰 번호 변경에 실패했습니다.");
    }
  },

  // 우분투 유저네임 등록 (가입 시 못 정한 기존 계정 전용, 1회성 — 이미 등록돼 있으면 실패)
  registerUbuntuUsername: async (ubuntuUsername) => {
    try {
      requireAccessToken();
      const response = await apiClient.patch("/api/users/me/ubuntu-username", { ubuntuUsername });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "우분투 유저네임 등록에 실패했습니다.");
    }
  },

  // Ubuntu 비밀번호 변경 — 떠 있는 컨테이너까지 함께 바뀐다(본인 확인은 현재 웹 비밀번호)
  changeUbuntuPassword: async (currentPassword, newPassword) => {
    try {
      requireAccessToken();
      const response = await apiClient.patch("/api/users/me/ubuntu-password", { currentPassword, newPassword });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "Ubuntu 비밀번호 변경에 실패했습니다.");
    }
  },

  // 비밀번호 변경
  changePassword: async (currentPassword, newPassword) => {
    try {
      requireAccessToken();
      const response = await apiClient.patch("/api/users/me/password", { currentPassword, newPassword });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "비밀번호 변경에 실패했습니다.");
    }
  },
};
