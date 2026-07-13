// 세션 만료 이벤트를 처리하기 위한 이벤트 시스템
class SessionEventManager {
  constructor() {
    this.listeners = [];
  }

  // 세션 만료 리스너 등록
  onSessionExpired(callback) {
    this.listeners.push(callback);

    // 클린업 함수 반환
    return () => {
      this.listeners = this.listeners.filter(
        (listener) => listener !== callback
      );
    };
  }

  // 세션 만료 이벤트 발생
  triggerSessionExpired(reason = "SESSION_EXPIRED") {
    this.listeners.forEach((callback) => callback(reason));
  }
}

// 전역 인스턴스
export const sessionEventManager = new SessionEventManager();
