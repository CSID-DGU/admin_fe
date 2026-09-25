// API 기본 설정
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "";

// 세션 이벤트 매니저 import
import { sessionEventManager } from "./sessionEventManager";
import { tokenStorage } from "./tokenStorage";

// 액세스 토큰(JWT)이 만료됐는지 payload의 exp 클레임으로 판단합니다.
// 파싱에 실패하면(형식이 다른 토큰 등) 만료로 단정하지 않고 서버 응답에 맡깁니다.
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return false;
  }
}

// API 클라이언트 클래스
class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const {
      headers = {},
      skipSessionExpiredCheck = false,
      ...fetchOptions
    } = options;
    const token = tokenStorage.getAccessToken();
    const requiresAuth = token && !endpoint.startsWith("/api/auth/");

    // 요청을 보내기 전에 토큰 만료를 먼저 확인합니다.
    // 네트워크 상태와 무관하게 만료 시 항상 같은 명확한 에러를 던지기 위함입니다.
    if (requiresAuth && !skipSessionExpiredCheck && isTokenExpired(token)) {
      sessionEventManager.triggerSessionExpired("SESSION_EXPIRED");
      const err = new Error("액세스 토큰이 만료되었습니다. 다시 로그인해주세요.");
      err.status = 401;
      err.code = "TOKEN_EXPIRED";
      throw err;
    }

    const config = {
      ...fetchOptions,
      headers: {
        ...(fetchOptions.body && { "Content-Type": "application/json" }),
        ...(requiresAuth && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // 응답이 성공적이라면 status와 함께 반환
      if (response.ok) {
        // 응답 본문이 있는지 확인
        const contentType = response.headers.get("content-type");
        let data = null;

        if (contentType && contentType.includes("application/json")) {
          try {
            data = await response.json();
          } catch {
            // JSON 파싱 실패 시 null로 처리
            data = null;
          }
        }

        return {
          status: response.status,
          data,
          headers: response.headers,
        };
      } else {
        // 에러 응답인 경우 JSON 데이터를 파싱하여 에러 정보 추출
        let errorData = null;
        try {
          errorData = await response.json();
        } catch {
          // JSON 파싱 실패 시 기본 에러 메시지
          errorData = { message: `HTTP error! status: ${response.status}` };
        }

        // 401 상태코드인 경우 세션 만료 처리 (로그인 요청은 제외)
        const errorCode = errorData?.code || errorData?.errorCode || errorData?.data?.code;
        if (response.status === 401 && !skipSessionExpiredCheck) {
          sessionEventManager.triggerSessionExpired(errorCode === "ACCOUNT_DISABLED" || errorData.message?.includes("ACCOUNT_DISABLED") ? "ACCOUNT_DISABLED" : "SESSION_EXPIRED");
        }

        const err = new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
        err.status = response.status;
        err.code = errorCode;
        err.data = errorData;
        throw err;
      }
    } catch (error) {
      // HTTP 오류는 호출 화면에서 처리합니다. 네트워크/파싱 오류만 한 번 기록합니다.
      if (!error.status) console.error("API Request Error:", error);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const url = new URL(endpoint, window.location.origin);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    return this.request(url.pathname + url.search, {
      method: "GET",
    });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

// API 클라이언트 인스턴스
const apiClient = new ApiClient();

export default apiClient;
