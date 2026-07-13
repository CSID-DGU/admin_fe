// API 기본 설정
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// 세션 이벤트 매니저 import
import { sessionEventManager } from "./sessionEventManager";

// API 클라이언트 클래스
class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      headers: {
        // body가 빈 문자열이 아닐 때만 Content-Type 설정
        ...(options.body !== "" && { "Content-Type": "application/json" }),
        ...options.headers,
      },
      ...options,
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

        console.error("API 에러 응답:", errorData);

        // 401 상태코드인 경우 세션 만료 처리 (로그인 요청은 제외)
        const errorCode = errorData.code || errorData.errorCode;
        if (response.status === 401 && !options.skipSessionExpiredCheck) {
          sessionEventManager.triggerSessionExpired(errorCode === "ACCOUNT_DISABLED" || errorData.message?.includes("ACCOUNT_DISABLED") ? "ACCOUNT_DISABLED" : "SESSION_EXPIRED");
        }

        const err = new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
        err.status = response.status;
        err.code = errorCode;
        throw err;
      }
    } catch (error) {
      console.error("API Request Error:", error);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    return this.request(url.pathname + url.search, {
      method: "GET",
    });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // POST 요청에 쿼리 파라미터 사용 (curl과 동일한 방식)
  async postWithQuery(endpoint, params = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    return this.request(url.pathname + url.search, {
      method: "POST",
      headers: {
        accept: "application/json;charset=UTF-8",
        // Content-Type은 빈 body일 때 제거
      },
      body: "", // 빈 body (curl -d '' 와 동일)
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: "DELETE",
    });
  }
}

// API 클라이언트 인스턴스
const apiClient = new ApiClient();

export default apiClient;
