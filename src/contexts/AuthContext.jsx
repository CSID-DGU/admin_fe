import { createContext, useState, useEffect, useCallback } from "react";
import { authService } from "../services/authService";
import { Button, Modal } from "../design-system";
import { useTranslation } from "react-i18next";
import { sessionEventManager } from "../services/sessionEventManager";
import { UbuntuUsernameRegisterForm } from "../components/Auth/UbuntuUsernameRegisterForm";

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
    logout();
    setShowSessionExpiredModal(true);
  }, [logout]);

  const handleSessionExpiredConfirm = () => {
    setShowSessionExpiredModal(false);
    if (sessionEndReason === "ACCOUNT_DISABLED") return;
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

  // 가입 시점에 우분투 유저네임을 못 받은 계정은 로그인 직후부터 컨테이너 신청이
  // 막혀 있다(UBUNTU_USERNAME_NOT_ASSIGNED). 마이페이지까지 스스로 찾아가지 않으면
  // 영영 등록을 못 하는 사용자가 많아, 등록 전에는 닫을 수 없는 모달로 바로 요구한다.
  // 관리자 계정도 예외 없이 뜬다.
  const needsUbuntuUsername = !isLoading && isAuthenticated && !!user && !user.ubuntuUsername;

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Modal visible={showSessionExpiredModal} onDismiss={handleSessionExpiredConfirm} header={sessionEndReason === "ACCOUNT_DISABLED" ? "계정 비활성화" : "다시 로그인이 필요합니다"} size="small" footer={<Button variant="primary" onClick={handleSessionExpiredConfirm}>{sessionEndReason === "ACCOUNT_DISABLED" ? "확인" : t("auth.login")}</Button>}>
        {sessionEndReason === "ACCOUNT_DISABLED" ? "계정이 비활성화되었습니다. 관리자에게 문의하세요." : "보안 업데이트 또는 세션 만료로 로그인이 해제되었습니다. 다시 로그인해주세요."}
      </Modal>
      <Modal visible={needsUbuntuUsername} dismissible={false} header="Ubuntu 유저네임 등록이 필요합니다" size="medium">
        <p style={{ marginTop: 0 }}>
          컨테이너 신청과 SSH 접속에 쓰이는 Ubuntu 유저네임이 아직 없어요. 등록해야 서비스를 계속 이용할 수 있어요.
          한 번 등록하면 바꿀 수 없으니 신중하게 정해주세요.
        </p>
        <UbuntuUsernameRegisterForm formId="mandatory-ubuntu-username" autoFocus />
      </Modal>
    </AuthContext.Provider>
  );
};

export default AuthContext;
