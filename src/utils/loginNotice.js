// 로그아웃시키며 로그인 화면에 한 번 보여줄 안내. 로그아웃하면 라우팅이 곧바로 로그인 화면으로 넘어가
// 페이지 이동 state가 사라질 수 있어 sessionStorage로 넘긴다.
const KEY = "loginNotice";

export function setLoginNotice(message) {
  try {
    sessionStorage.setItem(KEY, message);
  } catch {
    // 저장소를 못 쓰면 안내만 빠진다.
  }
}

export function takeLoginNotice() {
  try {
    const message = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return message || "";
  } catch {
    return "";
  }
}
