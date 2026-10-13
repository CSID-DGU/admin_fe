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

const SESSION_EXPIRED = "SESSION_EXPIRED";
const ACCOUNT_DISABLED = "ACCOUNT_DISABLED";
const REFRESH_LOCK_NAME = "decs-token-refresh";

function sessionEndReasonOf(errorCode, message) {
  return errorCode === ACCOUNT_DISABLED || message?.includes(ACCOUNT_DISABLED) ? ACCOUNT_DISABLED : SESSION_EXPIRED;
}

// 같은 브라우저의 여러 탭이 토큰 저장소를 함께 쓴다. 리프레시 토큰은 한 번 쓰면 새것으로 바뀌므로, 두 탭이 같은
// 토큰으로 동시에 갱신하면 늦은 쪽이 거절돼 로그아웃된다. 탭 사이 잠금으로 한 번에 한 탭만 갱신하게 한다.
// 잠금을 못 쓰는 환경(보안 연결이 아닌 주소 등)에서는 그대로 실행한다.
function withRefreshLock(task) {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK_NAME, task);
  }
  return task();
}

// API 클라이언트 클래스
class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.refreshInFlight = null;
  }

  // 만료된 액세스 토큰(staleToken)을 대신할 새 토큰을 돌려준다. 한 탭 안에서 동시에 온 요청은 갱신 한 번을 함께 기다린다.
  refreshAccessToken(staleToken) {
    if (!this.refreshInFlight) {
      this.refreshInFlight = withRefreshLock(() => this.exchangeRefreshToken(staleToken))
        .finally(() => { this.refreshInFlight = null; });
    }
    return this.refreshInFlight;
  }

  async exchangeRefreshToken(staleToken) {
    // 잠금을 기다리는 사이 다른 탭이 이미 갱신했으면 그 토큰을 쓴다.
    const current = tokenStorage.getAccessToken();
    if (current && current !== staleToken && !isTokenExpired(current)) return current;

    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      const err = new Error("리프레시 토큰이 없습니다. 다시 로그인해주세요.");
      err.status = 401;
      throw err;
    }

    const response = await fetch(`${this.baseURL}/api/auth/token-refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      let errorData = null;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      const err = new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      err.status = response.status;
      err.code = errorData?.code;
      throw err;
    }

    const data = await response.json();
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  }

  // 갱신까지 거절되면(401) 세션이 끝난 것이다. 네트워크 오류나 서버 장애로 갱신하지 못한 것은 세션 만료로 보지 않는다.
  async refreshOrEndSession(staleToken) {
    try {
      return await this.refreshAccessToken(staleToken);
    } catch (error) {
      if (error.status === 401) {
        sessionEventManager.triggerSessionExpired(sessionEndReasonOf(error.code, error.message));
        const err = new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
        err.status = 401;
        err.code = "TOKEN_EXPIRED";
        throw err;
      }
      throw error;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const {
      headers = {},
      skipSessionExpiredCheck = false,
      retriedAfterRefresh = false,
      ...fetchOptions
    } = options;
    let token = tokenStorage.getAccessToken();
    const requiresAuth = token && !endpoint.startsWith("/api/auth/");

    // 액세스 토큰이 이미 만료됐으면 보내기 전에 리프레시 토큰으로 새로 받습니다.
    // 갱신도 거절되면 세션 만료로 끝냅니다.
    if (requiresAuth && !skipSessionExpiredCheck && isTokenExpired(token)) {
      token = await this.refreshOrEndSession(token);
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

        const errorCode = errorData?.code || errorData?.errorCode || errorData?.data?.code;

        // 브라우저 시계로는 유효했는데 서버가 만료로 본 경우(시계 차이)에는 한 번만 갱신하고 다시 보냅니다.
        if (
          response.status === 401 && errorCode === "EXPIRED_ACCESS_TOKEN"
          && requiresAuth && !skipSessionExpiredCheck && !retriedAfterRefresh
        ) {
          await this.refreshOrEndSession(token);
          return await this.request(endpoint, { ...options, retriedAfterRefresh: true });
        }

        // 401 상태코드인 경우 세션 만료 처리 (로그인 요청은 제외)
        if (response.status === 401 && !skipSessionExpiredCheck) {
          sessionEventManager.triggerSessionExpired(sessionEndReasonOf(errorCode, errorData.message));
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
