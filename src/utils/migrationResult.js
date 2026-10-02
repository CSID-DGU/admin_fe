// 마이그레이션·재시작은 작업만 등록하고 202로 돌아온다. 끝날 때까지 마지막 작업 결과를 주기적으로 확인한다
// (새 노드에서 이미지를 처음 받거나 컨테이너 변경분을 저장하면 수 분 걸린다).
const FINISHED_PHASES = ["SUCCESS", "FAIL", "UNKNOWN"];
const POLL_INTERVAL_MS = 3000;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * @param {() => Promise<{ data?: any }>} fetchLatest 마지막 작업 결과 조회
 * @param {{ timeoutMs?: number, intervalMs?: number }} [options]
 * @returns {Promise<object | null>} 끝난 작업 결과. 제한 시간 안에 끝나지 않으면 null
 */
export async function waitForMigrationResult(fetchLatest, { timeoutMs = DEFAULT_TIMEOUT_MS, intervalMs = POLL_INTERVAL_MS } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    try {
      const res = await fetchLatest();
      const latest = res.data?.data ?? res.data;
      if (latest && FINISHED_PHASES.includes(latest.phase)) return latest;
    } catch {
      // 조회 한 번 실패는 다음 바퀴에 다시 본다
    }
  }
  return null;
}

// 재시작이 실패했을 때 사용자가 다음에 무엇을 하면 되는지 알려 준다. 목록에 없는 코드는 그대로 보인다.
const RESTART_FAILURE_HINTS = {
  IMAGE_CHANGES_TOO_LARGE: "컨테이너에 설치한 내용이 너무 커서 그대로 유지할 수 없습니다. '설치한 내용 유지'를 끄고 다시 시도하세요.",
  IMAGE_COMMIT_NO_CONTAINER: "저장할 컨테이너가 남아 있지 않습니다. '설치한 내용 유지'를 끄고 다시 시도하세요.",
};

/**
 * 재시작 작업 결과를 알림 한 건으로 바꾼다. 관리자·사용자 화면이 같은 문구를 쓴다.
 * @param {object | null} result waitForMigrationResult의 반환값
 * @returns {{ type: "success" | "warning" | "error", message: string }}
 */
export function describeRestartResult(result) {
  if (!result) {
    return { type: "warning", message: "재시작이 아직 끝나지 않았습니다. 잠시 뒤 새로고침해 확인해 주세요." };
  }
  if (result.phase === "SUCCESS") {
    return { type: "success", message: "컨테이너를 다시 시작했습니다. 접속 주소가 바뀌었을 수 있으니 접속 정보를 다시 확인해 주세요." };
  }
  if (result.phase === "UNKNOWN") {
    return { type: "warning", message: "재시작 결과를 확인할 수 없습니다. 잠시 뒤 컨테이너 상태를 확인해 주세요." };
  }
  const hint = RESTART_FAILURE_HINTS[result.errorCode];
  return {
    type: "error",
    message: hint ?? `재시작에 실패해 기존 컨테이너를 그대로 둡니다.${result.errorCode ? ` (${result.errorCode})` : ""}`,
  };
}
