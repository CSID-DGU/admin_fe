import apiClient from "./api.js";

// 인증 관련 API 서비스
export const authService = {
  // 토큰 관리
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  },

  getAccessToken: () => {
    return localStorage.getItem("accessToken");
  },

  getRefreshToken: () => {
    return localStorage.getItem("refreshToken");
  },

  clearTokens: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },

  // 이메일 인증번호 발송
  sendEmailVerification: async (email) => {
    try {
      // POST 요청으로 이메일을 쿼리 파라미터로 전송 (curl과 동일)
      const response = await apiClient.postWithQuery("/api/auth/email/send", {
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
      // POST 요청으로 이메일과 코드를 쿼리 파라미터로 전송 (curl과 동일)
      const response = await apiClient.postWithQuery("/api/auth/email/verify", {
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
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/users/me", {
        method: "GET",
        headers: {
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "사용자 정보 조회에 실패했습니다.");
    }
  },

  // 휴대폰 번호 변경
  updatePhone: async (newPhone) => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/users/me/phone", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ newPhone }),
      });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "휴대폰 번호 변경에 실패했습니다.");
    }
  },

  // 비밀번호 변경
  changePassword: async (currentPassword, newPassword) => {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await apiClient.request("/api/users/me/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          accept: "application/json;charset=UTF-8",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      return response;
    } catch (error) {
      if (error.status) throw error; // API 에러는 status 보존 위해 원본 유지
      throw new Error(error.message || "비밀번호 변경에 실패했습니다.");
    }
  },
};
