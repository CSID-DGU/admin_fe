import { createContext, useState, useEffect, useCallback } from "react";
import { authService } from "../services/authService";
import { Button, Modal } from "../design-system";
import { useTranslation } from "react-i18next";
import { sessionEventManager } from "../services/sessionEventManager";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const [sessionEndReason, setSessionEndReason] = useState("SESSION_EXPIRED");

  const logout = useCallback(() => {
    authService.clearTokens();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const handleSessionExpired = useCallback((reason) => {
    setSessionEndReason(reason);
    if (reason === "ACCOUNT_DISABLED") logout();
    setShowSessionExpiredModal(true);
  }, [logout]);

  const handleSessionExpiredConfirm = () => {
    setShowSessionExpiredModal(false);
    if (sessionEndReason === "ACCOUNT_DISABLED") return;
    logout();
    // 로그인 페이지로 리다이렉트
    window.location.href = "/login";
  };

  useEffect(() => {
    // Check if user is logged in on app start
    const checkAuthStatus = async () => {
      try {
        // Check for stored auth token
        const accessToken = authService.getAccessToken();
        const refreshToken = authService.getRefreshToken();

        if (accessToken && refreshToken) {
          // Verify token with server and get user info
          const response = await authService.getUserInfo();

          if (response.status === 200 && response.data) {
            setUser(response.data.data);
            setIsAuthenticated(true);
          } else {
            throw new Error("사용자 정보를 가져올 수 없습니다.");
          }
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
        // Clear invalid stored data
        authService.clearTokens();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    // 세션 만료 이벤트 리스너 등록
    const unsubscribe =
      sessionEventManager.onSessionExpired(handleSessionExpired);

    // 클린업
    return () => {
      unsubscribe();
    };
  }, [handleSessionExpired]);

  const login = async (credentials) => {
    try {
      // 실제 API 호출
      const response = await authService.login(
        credentials.email,
        credentials.password
      );

      if (response.status === 200 && response.data) {
        // 토큰 저장
        authService.setTokens(
          response.data.accessToken,
          response.data.refreshToken
        );

        // 사용자 정보 조회
        const userResponse = await authService.getUserInfo();

        if (userResponse.status === 200 && userResponse.data) {
          const userData = userResponse.data.data;
          setUser(userData);
          setIsAuthenticated(true);

          return { success: true, user: userData };
        } else {
          throw new Error("사용자 정보를 가져올 수 없습니다.");
        }
      } else {
        throw new Error("로그인에 실패했습니다.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        error: error.code === "ACCOUNT_DISABLED"
          ? "계정이 비활성화되었습니다. 관리자에게 문의하세요."
          : "이메일 또는 비밀번호가 올바르지 않습니다. 입력하신 정보를 다시 확인해주세요.",
      };
    }
  };

  const signup = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch("/api/auth/signup", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(userData)
      // });

      // if (!response.ok) {
      //   throw new Error("Signup failed");
      // }

      // Mock signup for development
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateUser = async () => {
    try {
      // 사용자 정보를 다시 불러와서 최신 상태로 업데이트
      const response = await authService.getUserInfo();

      if (response.status === 200 && response.data) {
        const userData = response.data.data;
        setUser(userData);
        return { success: true, user: userData };
      } else {
        throw new Error("사용자 정보 업데이트에 실패했습니다.");
      }
    } catch (error) {
      console.error("User update failed:", error);
      return {
        success: false,
        error: "사용자 정보를 업데이트할 수 없습니다. 다시 시도해주세요.",
      };
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    signup,
    updateUser,
    handleSessionExpired,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Modal visible={showSessionExpiredModal} onDismiss={handleSessionExpiredConfirm} header={sessionEndReason === "ACCOUNT_DISABLED" ? "계정 비활성화" : "세션 만료"} size="small" footer={<Button variant="primary" onClick={handleSessionExpiredConfirm}>{sessionEndReason === "ACCOUNT_DISABLED" ? "확인" : t("auth.login")}</Button>}>
        {sessionEndReason === "ACCOUNT_DISABLED" ? "계정이 비활성화되었습니다. 관리자에게 문의하세요." : "보안을 위해 세션이 만료되었습니다. 다시 로그인해주세요."}
      </Modal>
    </AuthContext.Provider>
  );
};

export default AuthContext;
